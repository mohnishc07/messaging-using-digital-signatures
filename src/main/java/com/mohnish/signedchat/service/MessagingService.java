package com.mohnish.signedchat.service;

import com.mohnish.signedchat.encoding.PayloadEncoder;
import com.mohnish.signedchat.model.ChatUser;
import com.mohnish.signedchat.model.SignedMessage;
import com.mohnish.signedchat.store.TrustedKeyStore;

import java.security.GeneralSecurityException;
import java.security.PublicKey;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class MessagingService {

    private final SignatureService signatureService;
    private final PayloadEncoder payloadEncoder;
    private final TrustedKeyStore trustedKeyStore;
    private final Map<String, List<SignedMessage>> inboxes = new HashMap<>();

    public MessagingService(
        SignatureService signatureService,
        PayloadEncoder payloadEncoder,
        TrustedKeyStore trustedKeyStore
    ) {
        this.signatureService = signatureService;
        this.payloadEncoder = payloadEncoder;
        this.trustedKeyStore = trustedKeyStore;
    }

    public SignedMessage send(
        ChatUser sender,
        String recipientId,
        String content
    ) throws GeneralSecurityException {
        if (
            sender == null ||
            invalidId(sender.getName()) ||
            invalidId(recipientId) ||
            content == null
        ) {
            throw new IllegalArgumentException(
                "Sender and recipient IDs must be nonblank and content must not be null"
            );
        }
        String senderId = sender.getName();
        byte[] payload = payloadEncoder.encode(senderId, recipientId, content);
        byte[] signature = signatureService.sign(
            payload,
            sender.getPrivateKey()
        );
        return new SignedMessage(content, signature, senderId, recipientId);
    }

    public boolean receive(SignedMessage message, String receivingUserId)
        throws GeneralSecurityException {
        if (
            message == null ||
            invalidId(receivingUserId) ||
            invalidId(message.getSenderId()) ||
            invalidId(message.getReceiverId()) ||
            message.getMessage() == null ||
            message.getSignature() == null ||
            message.getSignature().length == 0 ||
            !receivingUserId.equals(message.getReceiverId())
        ) {
            return false;
        }

        PublicKey senderKey = trustedKeyStore.getTrustedKey(
            message.getSenderId()
        );
        if (
            senderKey == null ||
            message.getMessage() == null ||
            message.getSignature() == null
        ) {
            return false;
        }

        byte[] payload = payloadEncoder.encode(
            message.getSenderId(),
            message.getReceiverId(),
            message.getMessage()
        );
        try {
            if (
                !signatureService.verify(
                    payload,
                    message.getSignature(),
                    senderKey
                )
            ) {
                return false;
            }
        } catch (java.security.SignatureException exception) {
            // Providers may throw instead of returning false for malformed signatures.
            return false;
        }

        inboxes
            .computeIfAbsent(receivingUserId, id -> new ArrayList<>())
            .add(message);
        return true;
    }

    private static boolean invalidId(String id) {
        return id == null || id.isBlank();
    }

    public List<SignedMessage> getInbox(String userId) {
        return new ArrayList<>(inboxes.getOrDefault(userId, List.of()));
    }
}
