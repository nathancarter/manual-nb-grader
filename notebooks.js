
import { Files } from './files.js'
import { cellToHTML, cellToDiv } from './representations.js'
import { swapContents, hasClass } from './ui-elements.js'
import { renameFile } from './main-ontology.js'

export class Notebook extends EventTarget {

    constructor ( element, filename ) {
        super()
        this._filename = filename
        this._element = element
        this._initialScore = 100
        if ( filename ) this.read( filename )
    }

    element () { return this._element }

    setInitialScore ( score ) {
        this._initialScore = score
        this.updateScoreCell()
    }
    getInitialScore () { return this._initialScore }

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

    filename () { return this._filename }

    write ( suppressFileEvents = false ) {
        if ( !this._filename || !this._data ) return
        return Files.write( this._filename, JSON.stringify( this._data ),
                            suppressFileEvents )
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

    insertComment ( index, markdown, classes = [ ] ) {
        if ( !this._data ) return
        const newCell = {
            cell_type : 'markdown',
            metadata : { is_grading_comment : true },
            source : markdown.split( '\n' ).map( line => line + '\n' )
        }
        this._data.cells.splice( index - 1, 0, newCell )
        const oldElements = this.cellElements()
        const newElement =
            cellToDiv( this._element.ownerDocument, newCell, classes )
        if ( index < oldElements.length )
            this._element.insertBefore( newElement, oldElements[index] )
        else
            this._element.appendChild( newElement )
        this.dispatchEvent( new CustomEvent( 'insert',
            { detail : { cell : newElement } } ) )
        this.write()
        return newElement
    }

    deleteCell ( index, suppressFileEvents = false ) {
        if ( !this._data ) return
        this._data.cells.splice( index - 1, 1 )
        const elementToDelete = this.cellElements()[index]
        elementToDelete.parentNode.removeChild( elementToDelete )
        this.dispatchEvent( new CustomEvent( 'delete',
            { detail : { cell : elementToDelete } } ) )
        this.write( suppressFileEvents )
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
        const language = this._data ?
            ( this._data.metadata.kernelspec.language
           || this._data.metadata.language_info.name ) : ''
        this.cells().forEach( cell =>
            html += cellToHTML( cell ).replace(
                '<code language="language-placeholder">',
                `<code language="${language}">` ) )
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
        return this._initialScore + result
    }

    getScoreCell () {
        if ( !this._data ) return
        const candidates = this.cellElements().filter( element =>
            hasClass( element, 'score-cell' ) )
        return candidates.length > 0 ? candidates[0] : null
    }

    addScoreCell ( suppressFileEvents = false ) {
        if ( this.getScoreCell() ) return
        const newCell = {
            cell_type : 'markdown',
            metadata : { is_grading_score : true },
            source : [ `Grade: ${this.totalScore()}\n` ]
        }
        this._data.cells.splice( 0, 0, newCell )
        const newElement =
            cellToDiv( this._element.ownerDocument, newCell, [ 'score-cell' ] )
        this._element.insertBefore( newElement,
                                    this.cellElements()[0].nextSibling )
        this.dispatchEvent( new CustomEvent( 'insert',
            { detail : { cell : newElement } } ) )
        this.write( suppressFileEvents )
        return newElement
    }

    deleteScoreCell ( suppressFileEvents = false ) {
        if ( !this.getScoreCell() ) return
        this.deleteCell( 1, suppressFileEvents )
    }

    updateScoreCell () {
        const toUpdate = this.getScoreCell()
        if ( !toUpdate ) return
        this._data.cells[0].source = [ `Grade: ${this.totalScore()}\n` ]
        toUpdate.innerHTML = cellToDiv( this._element.ownerDocument,
                                        this._data.cells[0],
                                        [ 'score-cell' ] ).innerHTML
        this.write()
    }

    rename ( newName ) {
        const oldName = this._filename
        this._filename = newName
        return renameFile( oldName, newName )
    }

}
