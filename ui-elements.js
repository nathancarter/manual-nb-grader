
import { Files } from "./files.js"

export const firstInClass = ( element, className ) =>
    [ ...element.getElementsByClassName( className ) ][0]

export const withFirstDo = ( element, className, func ) => {
    const first = firstInClass( element, className )
    if ( first ) func( first )
}

const getClasses = element =>
    element.getAttribute( 'class' ) ?
        element.getAttribute( 'class' ).split( ' ' ) : [ ]

const setClasses = ( element, classNames ) =>
    element.setAttribute( 'class', classNames.join( ' ' ) )

export const addClass = ( element, className ) =>
    setClasses( element,
        [ ...new Set( [ className, ...getClasses( element ) ] ) ] )

export const removeClass = ( element, className ) =>
    setClasses( element, getClasses( element ).filter( x => x != className ) )

export const hasClass = ( element, className ) =>
    ( element instanceof HTMLElement ) &&
        getClasses( element ).includes( className )

export const containingCell = element =>
    !element.parentNode ? null :
    element.parentNode.id == 'left-document' ? element :
    element.parentNode.id == 'right-document' ? element :
    containingCell( element.parentNode )

export const scrollToShow = target => {
    const cellBounding = target.getBoundingClientRect()
    const rowBounding =
        target.ownerDocument.getElementById( 'document-row' ).getBoundingClientRect()
    if ( cellBounding.top < rowBounding.top )
        target.scrollIntoView( true )
    else if ( cellBounding.bottom > rowBounding.bottom )
        target.scrollIntoView( false )
}

export const cellOpposite = cell => {
    const centerOf = element => {
        const rect = element.getBoundingClientRect()
        return { x : ( rect.left + rect.right ) / 2,
                 y : ( rect.top + rect.bottom ) / 2 }
    }
    const distance = ( P, Q ) =>
        Math.sqrt( ( P.x - Q.x ) * ( P.x - Q.x ) + ( P.y - Q.y ) * ( P.y - Q.y ) )
    const center = centerOf( cell )
    const doc = cell.ownerDocument
    const docCenterX = ( window.innerWidth
                      || doc.documentElement.clientWidth ) / 2
    const flippedCenter = { x : docCenterX + ( docCenterX - center.x ),
                            y : center.y }
    let result
    [ ...doc.getElementsByClassName( 'notebook-cell' ) ].forEach( compare => {
        if ( !result ) return result = compare
        if ( distance( flippedCenter, centerOf( compare ) )
           < distance( flippedCenter, centerOf( result ) ) )
            return result = compare
    } )
    return result
}

export const updateFileSelector = selector => {
    while ( selector.childNodes.length > 0 )
        selector.removeChild( selector.childNodes[0] )
    const defaultChoice = '< choose a file >'
    Files.names().then( names => {
        const oldValue = selector.value
        ;[ defaultChoice, ...names ].forEach( text => {
            const option = document.createElement( 'option' )
            option.setAttribute( 'value', text )
            option.textContent = text
            selector.appendChild( option )
        } )
        selector.value = oldValue
        if ( selector.value == '' ) selector.value = defaultChoice
    } )
}

export const swapContents = ( element1, element2 ) => {
    const children1 = [ ...element1.childNodes ]
    const children2 = [ ...element2.childNodes ]
    children1.forEach( child => element2.appendChild( child ) )
    children2.forEach( child => element1.appendChild( child ) )
}

const headingTagNames = [ 'H1', 'H2', 'H3', 'H4', 'H5', 'H6' ]

export const firstHeadingIn = node => {
    if ( headingTagNames.includes( node.tagName ) )
        return node
    for ( let child of node.childNodes ) {
        const headingInChild = firstHeadingIn( child )
        if ( headingInChild ) return headingInChild
    }
}

export const firstHeadingAfter = node => {
    const next = node.nextSibling
    if ( next ) {
        const headingInNext = firstHeadingIn( next )
        return headingInNext ? next : firstHeadingAfter( next )
    }   
}

export const firstHeadingBefore = node => {
    const prev = node.previousSibling
    if ( prev ) {
        const headingInPrev = firstHeadingIn( prev )
        return headingInPrev ? prev : firstHeadingBefore( prev )
    }   
}

export const containsHeadingWithText = ( element, text ) =>
    headingTagNames.some( tagName =>
        [ ...element.getElementsByTagName( tagName ) ].some( heading =>
            heading.textContent.trim().toLowerCase()
                == text.trim().toLowerCase() ) )
