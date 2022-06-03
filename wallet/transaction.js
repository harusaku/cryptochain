const uuid = require('uuid/v1');
const { MINING_REWARD, REWARD_INPUT } = require('../config');
const { verifySignature } = require('../util');

class Transaction {
    constructor({ senderWallet, recipient, amount, outputMap, input }) {
        this.id = uuid();
        this.outputMap =
            outputMap ||
            this.createOutputMap({
                senderWallet,
                recipient,
                amount,
            });

        this.input =
            input ||
            this.createInput({
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

    // validate transaction
    // whether the transaction is really made by senderWallet
    // or not chaged by other people
    static validTransaction(transaction) {
        const {
            input: { address, amount, signature },
            outputMap,
        } = transaction;

        // verify input.amount
        const outputTotal = Object.values(outputMap).reduce(
            (total, outputAmount) => total + outputAmount
        );

        if (amount !== outputTotal) {
            console.error(`Invalid transaction from ${address}`);
            return false;
        }

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

    static rewardTransaction({ minerWallet }) {
        return new this({
            input: REWARD_INPUT,
            outputMap: {
                [minerWallet.publicKey]: MINING_REWARD,
            },
        });
    }
}

module.exports = Transaction;
