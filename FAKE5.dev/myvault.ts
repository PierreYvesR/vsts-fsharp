
// This is a defensive copy from https://raw.githubusercontent.com/Microsoft/vsts-task-lib/91e03a14f1188edc658954320f9d75565b2d1da5/node/vault.ts
// To save ourself from breaking changes...
// Add some members for retrieving the decrypted value.

import Q = require('q');
import fs = require('fs');
import path = require('path');
import crypto = require('crypto');

var uuidV4 = require('uuid/v4');
var algorithm = "aes-256-ctr";

//
// Store sensitive data in proc.
// Main goal: Protects tasks which would dump envvars from leaking secrets inadvertently
//            the task lib clears after storing.
// Also protects against a dump of a process getting the secrets
// The secret is generated and stored externally for the lifetime of the task.
//
export class Vault {
    constructor(keyFile: string) {
        this._keyFile = keyFile;
        this._store = <{[key: string] : string}>{};
        this.genKey();
    }

    private _keyFile: string;
    private _store: { [key: string] : string };

    public initialize(): void {

    }

    public encryptSecret(data: string) : string {
        var key = this.getKey();
        var cipher = crypto.createCipher(algorithm, key);
        var crypted = cipher.update(data,'utf8','hex')
        crypted += cipher.final('hex');
        return crypted;
    }

    public storeSecret(name: string, data: string): boolean {
        if (!name || name.length == 0) {
            return false;
        }

        name = name.toLowerCase()
        if (!data || data.length == 0) {
            if (this._store.hasOwnProperty(name)) {
                delete this._store[name];
            }

            return false;
        }

        this._store[name] = this.encryptSecret(data);
        return true;
    }
    
    public retrieveDecrypted(name: string): string {
        var val = null;
        name = (name || '').toLowerCase()

        if (this._store.hasOwnProperty(name)) {
            val = this._store[name];
        }

        return val;
    }

    public retrieveSecret(name: string): string {
        var secret = null;
        name = (name || '').toLowerCase()

        if (this._store.hasOwnProperty(name)) {
            var key = this.getKey();
            var data = this._store[name];
            var decipher = crypto.createDecipher(algorithm, key)
            var dec = decipher.update(data,'hex','utf8')
            dec += decipher.final('utf8');
            secret = dec;
        }

        return secret;
    }

    private getKey()
    {
        return fs.readFileSync(this._keyFile).toString('utf8');
    }

    private genKey(): void {
        fs.writeFileSync(this._keyFile, uuidV4(), 'utf8');
    } 
}