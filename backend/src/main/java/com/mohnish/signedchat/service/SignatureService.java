package com.mohnish.signedchat.service;

import com.mohnish.signedchat.model.SignedMessage;

import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;

public class SignatureService {

    public KeyPair generateKeyPair() throws GeneralSecurityException {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("Ed25519");
        return generator.generateKeyPair();
    }

    // deprecated because we are not going to use the sign method directly, instead we will use the signMessage method which will take care of signing the message and creating a signed message object
    //     public byte[] sign(byte[] message, PrivateKey privateKey)
    //         throws GeneralSecurityException {
    //         // So a private key is like a name of the person, so we are not going to reveal the name and ask him to put up a signature to verify the person is real or not
    //         // We create a signature object which gets initialised with that specific algorithm
    //         // then each byte of the private key is used to create the signature and update the message with that signature
    //
    //         Signature signature = Signature.getInstance("Ed25519");
    //         signature.initSign(privateKey);
    //         signature.update(message);
    //
    //         return signature.sign();
    //     }
    public SignedMessage signMessage(
        String message,
        PrivateKey privateKey,
        String senderId,
        String receiverId
    ) throws GeneralSecurityException {
        byte[] messageBytes = message.getBytes();
        Signature signature = Signature.getInstance("Ed25519");
        signature.initSign(privateKey);
        signature.update(messageBytes);
        byte[] signedMessage = signature.sign();

        return new SignedMessage(message, signedMessage, senderId, receiverId);
    }

    public byte[] sign(byte[] payload, PrivateKey privateKey)
        throws GeneralSecurityException {
        Signature signer = Signature.getInstance("Ed25519");
        signer.initSign(privateKey);
        signer.update(payload);
        return signer.sign();
    }

    //verifier service
    public boolean verify(byte[] message, byte[] signature, PublicKey publicKey)
        throws GeneralSecurityException {
        Signature verifier = Signature.getInstance("Ed25519");
        verifier.initVerify(publicKey);
        verifier.update(message);

        return verifier.verify(signature);
    }
}
