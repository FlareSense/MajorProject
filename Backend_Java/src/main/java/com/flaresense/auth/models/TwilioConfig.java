package com.flaresense.auth.models;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Column;

@Entity
@Table(name = "twilio_config")
public class TwilioConfig {

    @Id
    @Column(name = "user_id")
    private Long userId;

    private String accountSid;
    private String authToken;
    private String fromNumber;
    private String toNumber;

    @Column(name = "enable_whatsapp", columnDefinition = "boolean default false")
    private Boolean enableWhatsapp;

    @Column(name = "telegram_bot_token")
    private String telegramBotToken;

    @Column(name = "telegram_chat_id")
    private String telegramChatId;

    public TwilioConfig() {}

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getAccountSid() { return accountSid; }
    public void setAccountSid(String accountSid) { this.accountSid = accountSid; }
    public String getAuthToken() { return authToken; }
    public void setAuthToken(String authToken) { this.authToken = authToken; }
    public String getFromNumber() { return fromNumber; }
    public void setFromNumber(String fromNumber) { this.fromNumber = fromNumber; }
    public String getToNumber() { return toNumber; }
    public void setToNumber(String toNumber) { this.toNumber = toNumber; }
    
    public Boolean getEnableWhatsapp() { return enableWhatsapp != null ? enableWhatsapp : false; }
    public void setEnableWhatsapp(Boolean enableWhatsapp) { this.enableWhatsapp = enableWhatsapp; }
    
    public String getTelegramBotToken() { return telegramBotToken; }
    public void setTelegramBotToken(String telegramBotToken) { this.telegramBotToken = telegramBotToken; }
    
    public String getTelegramChatId() { return telegramChatId; }
    public void setTelegramChatId(String telegramChatId) { this.telegramChatId = telegramChatId; }
}
