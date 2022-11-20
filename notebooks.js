
import { Files } from './files.js'
import { cellToHTML, cellToDiv } from './representations.js'
import { swapContents } from './ui-elements.js'

export class Notebook extends EventTarget {

    constructor ( element, filename ) {
        super()
        this._filename = filename
        this._element = element
        if ( filename ) this.read( filename )
    }

    element () { return this._element }

    read ( filename ) {
        this._filename = filename
        return Files.read( filename ).then( contents => {
            this._contents = contents
            this._data = contents ? JSON.parse( contents ) : undefined
        } ).then( () => {
            this.populate( this._element )
            this.dispatchEvent( new Event( 'load' ) )
        } )
    }

    write () {
        if ( !this._filename || !this._data ) return
        return Files.write( this._filename, JSON.stringify( this._data ) )
    }

    // there is an import indexing confusion; see comments below
    cells () {
        return this._data ? this._data.cells : [ ]
    }

    // the cell elements in the page include one for every cell in this
    // notebook, plus an extra one at the beginning, so the user can insert
    // things there.  consequently, cells()[0] corresponds to cellElements()[1],
    // and in general, cells()[i] corresponds to cellElements()[i+1].
    // all functions below expect to receive an index into the cellElements()
    // array, because the indices are coming from the view.
    cellElements () {
        return [ ...this._element.getElementsByClassName( 'notebook-cell' ) ]
    }

    insertComment ( index, markdown ) {
        if ( !this._data ) return
        const newCell = {
            cell_type : 'markdown',
            metadata : { is_grading_comment : true },
            source : markdown.split( '\n' ).map( line => line + '\n' )
        }
        this._data.cells.splice( index - 1, 0, newCell )
        const oldElements = this.cellElements()
        const newElement = cellToDiv( this._element.ownerDocument, newCell )
        if ( index < oldElements.length )
            this._element.insertBefore( newElement, oldElements[index] )
        else
            this._element.appendChild( newElement )
        this.dispatchEvent( new CustomEvent( 'insert',
            { detail : { cell : newElement } } ) )
        this.write()
        return newElement
    }

    deleteCell ( index ) {
        if ( !this._data ) return
        this._data.cells.splice( index - 1, 1 )
        const elementToDelete = this.cellElements()[index]
        elementToDelete.parentNode.removeChild( elementToDelete )
        this.dispatchEvent( new CustomEvent( 'delete',
            { detail : { cell : elementToDelete } } ) )
        this.write()
    }

    commentMarkdown ( index ) {
        return this._data ? this._data.cells[index - 1].source.join( '' ) : null
    }

    duplicateComment ( index ) {
        return this._data ?
            this.insertComment( index + 1, this.commentMarkdown( index ) ) :
            undefined
    }

    startEditing ( index ) {
        if ( !this._data ) return
        const cell = this.cellElements()[index]
        const doc = cell.ownerDocument
        const container = doc.createElement( 'div' )
        const editor = doc.createElement( 'textarea' )
        editor.value = this.commentMarkdown( index )
        editor.style.width = '100%'
        editor.style.height = '10em'
        container.appendChild( editor )
        swapContents( container, cell )
        editor.focus()
        editor.addEventListener( 'blur', () => {
            this.deleteCell( index )
            this.insertComment( index, editor.value )
        } )
    }

    moveCell ( index, delta ) {
        if ( !this._data ) return
        let newIndex = index + delta
        if ( newIndex < 0 || newIndex >= this.cellElements().length ) return
        // delete from old location
        const origData = this._data.cells[index - 1]
        this._data.cells.splice( index - 1, 1 )
        const elementToMove = this.cellElements()[index]
        elementToMove.parentNode.removeChild( elementToMove )
        // insert at new location
        this._data.cells.splice( newIndex - 1, 0, origData )
        if ( newIndex < this.cellElements().length )
            this._element.insertBefore( elementToMove, this.cellElements()[newIndex] )
        else
            this._element.appendChild( elementToMove )
        // notify
        this.dispatchEvent( new CustomEvent( 'move',
            { detail : { cell : elementToMove, from : index, to : newIndex } } ) )
        this.write()
    }

    populate ( element ) {
        let html = ''
        html += '<div class="cell-zero notebook-cell"></div>'
        this.cells().forEach( cell => html += cellToHTML( cell ) )
        element.innerHTML = html
    }

    totalScore () {
        if ( !this._data ) return
        let result = 0
        this._data.cells.forEach( cell => {
            if ( cell.cell_type != 'markdown'
              || !cell.metadata.is_grading_comment ) return
            cell.source.forEach( line => {
                if ( /^\s*[+-](?:\d+\.?\d*|\d*\.?\d+)\s*$/.test( line ) )
                    result += parseFloat( line )
            } )
        } )
        return result
    }

}
