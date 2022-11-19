
import { Files } from './files.js'

const uploadFilesArray = filesArray => {
    const mapping = { }
    Promise.all(
        filesArray.map( file =>
            file.text().then( text => mapping[file.name] = text ) )
    ).then( () => Files.add( mapping ) )
}

export const stopDragDropEvents = element => {
    [ 'dragenter', 'dragover', 'dragleave', 'drop' ].forEach(
        name => element.addEventListener( name, event => {
            event.preventDefault()
            event.stopPropagation()
        }, false )
    )
}

export const uploadDroppedFiles = event =>
    uploadFilesArray( [ ...event.dataTransfer.files ] )

export const promptAndUploadFiles = event => {
    const fileInput = event.target.ownerDocument.createElement( 'input' )
    fileInput.setAttribute( 'type', 'file' )
    fileInput.setAttribute( 'multiple', true )
    fileInput.addEventListener( 'change',
        () => uploadFilesArray( [ ...fileInput.files ] ) )
    fileInput.dispatchEvent( new MouseEvent( 'click' ) )
}
