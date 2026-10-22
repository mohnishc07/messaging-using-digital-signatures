package com.mohnish.signedchat.model;

public class SignedMessage {

    private final String message;
    private final byte[] signature;
    private final String senderId;
    private final String receiverId;

    public SignedMessage(
        String message,
        byte[] signature,
        String senderId,
        String receiverId
    ) {
        this.message = message;
        this.signature = signature;
        this.senderId = senderId;
        this.receiverId = receiverId;
    }

    public String getMessage() {
        return message;
    }

    public byte[] getSignature() {
        return signature;
    }

    public String getSenderId() {
        return senderId;
    }

    public String getReceiverId() {
        return receiverId;
    }

    public String toString() {
        return (
            "SignedMessage{" +
            "message='" +
            message +
            '\'' +
            ", signature=" +
            java.util.Base64.getEncoder().encodeToString(signature) +
            ", senderId='" +
            senderId +
            '\'' +
            ", receiverId='" +
            receiverId +
            '\'' +
            '}'
        );
    }
}
