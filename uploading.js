
import { Files } from './files.js'

const uploadFilesArray = filesArray => {
    const mapping = { }
    Promise.all(
        filesArray.map( file =>
            file.text().then( text => mapping[file.name] = text ) )
    ).then( () => Files.add( mapping ) )
}

export const promptAndUploadFiles = event => {
    const fileInput = event.target.ownerDocument.createElement( 'input' )
    fileInput.setAttribute( 'type', 'file' )
    fileInput.setAttribute( 'multiple', true )
    fileInput.addEventListener( 'change',
        () => uploadFilesArray( [ ...fileInput.files ] ) )
    fileInput.dispatchEvent( new MouseEvent( 'click' ) )
}
