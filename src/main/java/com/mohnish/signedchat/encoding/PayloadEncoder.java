package com.mohnish.signedchat.encoding;

public class PayloadEncoder {

    public byte[] encode(String senderId, String recipientId, String content) {
        // Base64 fields cannot contain the delimiter, keeping the payload unambiguous.
        java.util.Base64.Encoder encoder = java.util.Base64.getEncoder();
        String payload =
            encoder.encodeToString(
                senderId.getBytes(java.nio.charset.StandardCharsets.UTF_8)
            ) +
            ":" +
            encoder.encodeToString(
                recipientId.getBytes(java.nio.charset.StandardCharsets.UTF_8)
            ) +
            ":" +
            encoder.encodeToString(
                content.getBytes(java.nio.charset.StandardCharsets.UTF_8)
            );
        return payload.getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    public static String encodePayload(
        String message,
        byte[] signature,
        String senderId,
        String receiverId
    ) {
        String encodedMessage = java.util.Base64.getEncoder().encodeToString(
            message.getBytes(java.nio.charset.StandardCharsets.UTF_8)
        );

        String encodedSignature = java.util.Base64.getEncoder().encodeToString(
            signature
        );

        String encodedSenderId = java.util.Base64.getEncoder().encodeToString(
            senderId.getBytes(java.nio.charset.StandardCharsets.UTF_8)
        );

        String encodedReceiverId = java.util.Base64.getEncoder().encodeToString(
            receiverId.getBytes(java.nio.charset.StandardCharsets.UTF_8)
        );

        return (
            encodedMessage +
            ":" +
            encodedSignature +
            ":" +
            encodedSenderId +
            ":" +
            encodedReceiverId
        );
    }

    public static String[] decodePayload(String payload) {
        String[] parts = payload.split(":");
        if (parts.length != 4) {
            throw new IllegalArgumentException("Invalid payload format");
        }
        return parts;
    }
}
