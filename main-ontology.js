
import { Notebook } from './notebooks.js'
import {
    updateFileSelector, firstInClass, scrollToShow, cellOpposite,
    addClass, removeClass, hasClass
} from './ui-elements.js'
import { Files } from './files.js'

const notebooks = [ null, null ]
const selectors = [ null, null ]
const documents = [ null, null ]
let mainDocument = null

export const getNotebooks = () => notebooks
export const getSelectors = () => selectors
export const getDocuments = () => documents

export const other = thing =>
    thing == notebooks[0] ? notebooks[1] :
    thing == notebooks[1] ? notebooks[0] :
    thing == selectors[0] ? selectors[1] :
    thing == selectors[1] ? selectors[0] :
    thing == documents[0] ? documents[1] :
    thing == documents[1] ? documents[0] : null

export const setUpOntology = document => {
    // lift from the document all the important things
    mainDocument = document
    documents[0] = document.getElementById( 'left-document' )
    documents[1] = document.getElementById( 'right-document' )
    selectors[0] = document.getElementById( 'left-file-select' )
    selectors[1] = document.getElementById( 'right-file-select' )
    // create a notebook for each document and connect them to the selectors
    notebooks[0] = new Notebook( documents[0] )
    notebooks[1] = new Notebook( documents[1] )
    for ( let i = 0 ; i < 2 ; i++ )
        selectors[i].addEventListener( 'change', () =>
            notebooks[i].read( selectors[i].value ) )
    // connect "filesystem" changes to file selectors
    const updateFileSelectors = () => selectors.forEach( updateFileSelector )
    Files.addEventListener( 'add', updateFileSelectors )
    Files.addEventListener( 'delete', updateFileSelectors )
    Files.addEventListener( 'deleted-all', updateFileSelectors )
    updateFileSelectors()
}

const sideIndexForCell = cell =>
    documents[0].contains( cell ) ? 0 :
    documents[1].contains( cell ) ? 1 : null
export const notebookForCell = cell => notebooks[sideIndexForCell( cell )]
export const selectorForCell = cell => selectors[sideIndexForCell( cell )]
export const documentForCell = cell => documents[sideIndexForCell( cell )]

export const currentCell = () => firstInClass( mainDocument, 'focused' )
export const currentNotebook = () => notebookForCell( currentCell() )
export const currentSelector = () => selectorForCell( currentCell() )
export const currentDocument = () => documentForCell( currentCell() )
export const currentIndex = () =>
    currentNotebook().cellElements().indexOf( currentCell() )

export const moveFocus = target => {
    if ( !target ) return
    const currentFocus = currentCell()
    if ( currentFocus ) removeClass( currentFocus, 'focused' )
    addClass( target, 'focused' )
    scrollToShow( target )
}    
export const switchFocus = () => {
    const cell = currentCell()
    if ( !cell ) return
    const opp = cellOpposite( cell )
    if ( opp ) moveFocus( opp )
}

export const previousCell = element =>
    !element ? previousCell( currentCell() ) :
    !element.previousSibling ? null :
    hasClass( element.previousSibling, 'notebook-cell' ) ? element.previousSibling :
    previousCell( element.previousSibling )
export const nextCell = element =>
    !element ? nextCell( currentCell() ) :
    !element.nextSibling ? null :
    hasClass( element.nextSibling, 'notebook-cell' ) ? element.nextSibling :
    nextCell( element.nextSibling )

