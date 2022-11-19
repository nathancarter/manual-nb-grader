
const nameMatchesEvent = ( comboName, event ) => {
    const modifiers =
        { meta : false, shift : false, alt : false, control : false }
    if ( comboName == '+' ) {
        modifiers.shift = true
    } else {
        comboName.split( '+' ).forEach( entry => {
            if ( modifiers.hasOwnProperty( entry.toLowerCase() ) )
                modifiers[entry.toLowerCase()] = true
            else
                comboName = entry
        } )
    }
    return event.shiftKey == modifiers.shift
        && event.metaKey == modifiers.meta
        && event.altKey == modifiers.alt
        && event.ctrlKey == modifiers.control
        && event.key == comboName
}

export const keyboardHandler = mapping => event => {
    let handled = false
    if ( event.target.tagName == 'TEXTAREA' ) {
        if ( nameMatchesEvent( 'Shift+Enter', event ) ) event.target.blur()
        return
    }
    Object.getOwnPropertyNames( mapping ).forEach( comboName => {
        if ( nameMatchesEvent( comboName, event ) ) {
            event.preventDefault()
            event.stopPropagation()
            mapping[comboName]( event )
            handled = true
        }
    } )
    // if ( !handled ) console.log( `Unhandled keystroke: ${event.key}` )
}
