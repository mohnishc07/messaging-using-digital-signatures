package com.mohnish.signedchat;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import com.jayway.jsonpath.JsonPath;
import java.security.KeyFactory;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@AutoConfigureMockMvc
class UserKeyTests {
    @Autowired MockMvc mvc;
    @Test void privateKeyOnlyAppearsInSuccessfulCreation() throws Exception {
        String creation = mvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"key-reveal-user\"}"))
            .andExpect(status().isCreated()).andExpect(header().string("Cache-Control", containsString("no-store")))
            .andExpect(jsonPath("$.privateKey", not(emptyOrNullString()))).andExpect(jsonPath("$.publicKey", not(emptyOrNullString())))
            .andReturn().getResponse().getContentAsString();
        KeyFactory factory = KeyFactory.getInstance("Ed25519");
        String secret = JsonPath.read(creation, "$.privateKey"), publicKey = JsonPath.read(creation, "$.publicKey");
        Signature signer = Signature.getInstance("Ed25519");
        signer.initSign(factory.generatePrivate(new PKCS8EncodedKeySpec(Base64.getDecoder().decode(secret))));
        byte[] payload = "key pair validation".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        signer.update(payload); byte[] signature = signer.sign();
        Signature verifier = Signature.getInstance("Ed25519");
        verifier.initVerify(factory.generatePublic(new X509EncodedKeySpec(Base64.getDecoder().decode(publicKey))));
        verifier.update(payload); assertTrue(verifier.verify(signature));
        mvc.perform(get("/api/users/key-reveal-user")).andExpect(status().isOk()).andExpect(jsonPath("$.privateKey").doesNotExist());
        mvc.perform(get("/api/users")).andExpect(status().isOk()).andExpect(jsonPath("$[*].privateKey", empty()));
        mvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"key-reveal-user\"}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.privateKey").doesNotExist());
    }
    @Test void additionalUsersCanExchangeMessages() throws Exception {
        for (String name : new String[]{"Carol", "David", "Erin"}) {
            mvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"" + name + "\"}"))
                .andExpect(status().isCreated());
        }
        mvc.perform(post("/api/messages").contentType(MediaType.APPLICATION_JSON)
            .content("{\"sender\":\"Carol\",\"recipient\":\"Erin\",\"content\":\"Hello Erin\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.delivered", is(true)));
        mvc.perform(get("/api/users/Erin/inbox")).andExpect(jsonPath("$[0].senderId", is("Carol")));
    }
    @Test void creationLocationEncodesSpaces() throws Exception {
        mvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"New Person\"}"))
            .andExpect(status().isCreated()).andExpect(header().string("Location", "/api/users/New%20Person"));
    }
}
