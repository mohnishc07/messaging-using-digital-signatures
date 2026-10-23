package com.mohnish.signedchat.store;

import java.security.PublicKey;
import java.util.Map;

public class TrustedKeyStore {

    private Map<String, PublicKey> trustedKeySet = new java.util.HashMap<>();

    public void registerTrustedKey(String userId, PublicKey publicKey) {
        this.trustedKeySet.put(userId, publicKey);
    }

    public PublicKey getTrustedKey(String userId) {
        return this.trustedKeySet.get(userId);
    }

    public boolean isTrusted(String userId) {
        return this.trustedKeySet.containsKey(userId);
    }
}
