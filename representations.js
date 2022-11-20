
const highlightScoresInMarkdown = md => {
    const isAScore = line => /^\s*[+-](?:\d+\.?\d*|\d*\.?\d+)\s*$/.test( line )
    const highlightLine = line => parseFloat( line ) >= 0 ?
        `<span class="good-score">${line}</span>` :
        `<span class="bad-score">${line}</span>`
    return md.split( '\n' ).map( line =>
        isAScore( line ) ? highlightLine( line ) : line ).join( '\n' )
}

const cellHTML = ( innerHTML, classes = [ ] ) => `
    <div class="${classes.join( ' ' )} notebook-cell">
        ${innerHTML}
    </div>
`

export const cellToHTML = ( cell, focused = false ) => {
    let classes = focused ? [ 'focused' ] : [ ]
    // Case 1: cell is Markdown source
    if ( cell.cell_type == 'markdown' ) {
        const md = highlightScoresInMarkdown( cell.source.join( '' ) )
        let mainHTML = markdownToHTMLWithLaTeX( md )
        if ( cell.metadata.is_grading_comment ) {
            mainHTML = `
                <div class="pure-menu pure-menu-horizontal"
                     style="height: 2em; text-align: right;">
                    <ul class="pure-menu-list">
                        <li class="pure-menu-item">
                            <a href="#" class="pure-menu-link">
                                <i class="fa-solid fa-arrow-up"></i></a>
                        </li>
                        <li class="pure-menu-item">
                            <a href="#" class="pure-menu-link">
                                <i class="fa-solid fa-arrow-down"></i></a>
                        </li>
                        <li class="pure-menu-item">
                            <a href="#" class="pure-menu-link">
                                <i class="fa-solid fa-arrows-left-right"></i></a>
                        </li>
                        <li class="pure-menu-item">
                            <a href="#" class="pure-menu-link">
                                <i class="fa-solid fa-copy"></i></a>
                        </li>
                        <li class="pure-menu-item">
                            <a href="#" class="pure-menu-link">
                                <i class="fa-solid fa-pen"></i></a>
                        </li>
                        <li class="pure-menu-item">
                            <a href="#" class="pure-menu-link">
                                <i class="fa-solid fa-trash"></i></a>
                        </li>
                    </ul>
                </div>
            ` + mainHTML
            classes.push( 'grading-comment' )
        }
        return cellHTML( mainHTML, classes )
    }
    // Case 2: cell is code
    if ( cell.cell_type == 'code' ) {
        return cellHTML( [
            '<p><font size="-2">Input:</font></p>',
            `<pre><code>${cell.source.join( '' )}</code></pre>`,
            '<p><font size="-2">Output:</font></p>',
            '<div class="cell-output">',
            ...cell.outputs.map( output => outputToHTML( output ) ),
            '</div>'
        ].join( '\n' ), classes )
    }
    // Fallback on generic (and bad) solution:
    return cellHTML( `<pre>${JSON.stringify( cell, null, 4 )}</pre>`, classes )
}

export const cellToDiv = ( document, cell, focused ) => {
    const temp = document.createElement( 'div' )
    temp.innerHTML = cellToHTML( cell, focused )
    const result = [ ...temp.getElementsByClassName( 'notebook-cell' ) ][0]
    temp.removeChild( result )
    return result
}

const outputToHTML = output => {
    // Case 1: output is text on stdout/stderr
    if ( output.output_type == 'stream' )
        return `<pre>${output.text}</pre>`
    // Case 2: output is an execution result; subcases for each mime type
    if ( output.output_type == 'execute_result' ) {
        // Subcase: LaTeX
        if ( output.data.hasOwnProperty( 'text/latex' ) )
            return output.data['text/latex']
        // Last attempt: plain text
        if ( output.data.hasOwnProperty( 'text/plain' ) )
            return `<pre>${output.data['text/plain']}</pre>`
        // Okay, fallback on bad solution at the end, below...
    }
    // Case 3: output is display data, like a plot
    if ( output.output_type == 'display_data' ) {
        // Subcase: image
        if ( output.data.hasOwnProperty( 'image/png' ) )
            return `<img src="data:image/png;base64, ${output.data['image/png']}"/>`
        // Okay, fallback on bad solution at the end, below...
    }
    // Fallback on generic (and bad) solution:
    return `<pre>${JSON.stringify( output, null, 4 )}</pre>`
}

let markdownConverter

export const installMarkdownConverter = converter =>
    markdownConverter = converter

const markdownToHTMLWithLaTeX = md => {
    const markerForIndex = index => `LATEX-MARKER-${index}`
    const nextUnusedIndex = () => {
        let result = 0
        while ( md.includes( markerForIndex( result ) ) ) result++
        return result
    }
    const LaTeXre = /\$(?:[^\\$]|\\.)+\$|\$\$(?:[^\\$]|\\.|\r|\n)+\$\$/
    const mapping = { }
    let match
    while ( match = LaTeXre.exec( md ) ) {
        let key = markerForIndex( nextUnusedIndex() )
        const value = match[0]
        mapping[key] = value
        if ( key.substring( 0, 2 ) == '$$' ) key = `\n\n${key}\n\n`
        md = md.substring( 0, match.index ) + key
           + md.substring( match.index + value.length )
    }
    let html = markdownConverter( md )
    Object.getOwnPropertyNames( mapping ).forEach( key =>
        html = html.replace( key, mapping[key].replace( /\$/g, '$$$$' ) ) )
    return html
}
