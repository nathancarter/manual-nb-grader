
import { Dexie } from 'https://unpkg.com/dexie/dist/dexie.mjs'

class FilesModel extends EventTarget {

    constructor () {
        super()
        this._db = new Dexie( 'NotebooksDatabase' )
        this._db.version( 1 ).stores( { notebooks : 'name, json' } )
    }

    names () {
        return this._db.notebooks.toArray().then( entries =>
            entries.map( entry => entry.name ) )
    }

    add ( nameToContentsMapping ) {
        const fileNames = Object.getOwnPropertyNames( nameToContentsMapping )
        return this._db.notebooks.bulkPut(
            fileNames.map( name => {
                return { name, contents : nameToContentsMapping[name] }
            } )
        ).then( () =>
            this.dispatchEvent( new CustomEvent( 'add',
                { detail : fileNames } ) )
        )
    }

    delete ( name ) {
        return this._db.notebooks.where( 'name' ).equals( name ).delete()
            .then( () => this.dispatchEvent(
                new CustomEvent( 'delete', { detail : name } ) ) )
    }

    deleteAll () {
        this._db.notebooks.clear()
            .then( () => this.dispatchEvent(
                new Event( 'deleted-all' ) ) )
    }

    read ( name ) {
        return this._db.notebooks.where( 'name' ).equals( name ).first()
            .then( entry => entry ? entry.contents : undefined )
    }

    write ( name, contents, suppressEvents = false ) {
        return this._db.notebooks.put( { name, contents } )
            .then( () => {
                if ( !suppressEvents )
                    this.dispatchEvent(
                        new CustomEvent( 'change', { detail : name } ) )
            } )
    }

    rename ( oldName, newName ) {
        return this.read( oldName ).then( contents => {
            return this._db.notebooks.where( 'name' ).equals( oldName ).delete().then(
                () => this.write( newName, contents, true )
            ).then(
                () => this.dispatchEvent(
                    new CustomEvent( 'rename', { oldName, newName } ) )
            )
        } )
    }

    debug () {
        return this._db.notebooks.toArray().then( console.log )
    }

}

export const Files = new FilesModel()
