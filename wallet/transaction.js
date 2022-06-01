const uuid = require('uuid/v1');
const { verifySignature } = require('../util');

class Transaction {
    constructor({ senderWallet, recipient, amount }) {
        this.id = uuid();
        this.outputMap = this.createOutputMap({
            senderWallet,
            recipient,
            amount,
        });

        this.input = this.createInput({
            senderWallet,
            outputMap: this.outputMap,
        });
    }

    createOutputMap({ senderWallet, recipient, amount }) {
        const outputMap = {};

        outputMap[recipient] = amount;
        outputMap[senderWallet.publicKey] = senderWallet.balance - amount;

        return outputMap;
    }

    createInput({ senderWallet, outputMap }) {
        return {
            timestamp: Date.now(),
            amount: senderWallet.balance,
            address: senderWallet.publicKey,
            signature: senderWallet.sign(outputMap),
        };
    }

    update({ senderWallet, recipient, amount }) {
        // throw Error because amount exceeds balance
        if (this.outputMap[senderWallet.publicKey] < amount) {
            throw new Error('Amount exceeds balance');
        }

        // update outputMap
        if (!this.outputMap[recipient]) {
            this.outputMap[recipient] = amount;
        } else {
            this.outputMap[recipient] += amount;
        }
        this.outputMap[senderWallet.publicKey] -= amount;

        // update input
        this.input = this.createInput({
            senderWallet,
            outputMap: this.outputMap,
        });
    }

    static validTransaction(transaction) {
        const {
            input: { address, amount, signature },
            outputMap,
        } = transaction;

        // verify signature
        if (
            !verifySignature({
                publicKey: address,
                data: outputMap,
                signature,
            })
        ) {
            console.error(`Invalid signature from ${address}`);
            return false;
        }

        return true;
    }
}

module.exports = Transaction;
