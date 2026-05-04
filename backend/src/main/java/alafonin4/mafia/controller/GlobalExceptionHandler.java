package alafonin4.mafia.controller;

import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException exception) {
        log.warn("Request failed validation: {}", exception.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(buildResponseMessage(exception.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<String> handleIllegalState(IllegalStateException exception) {
        log.warn("Request rejected due to state conflict: {}", exception.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(buildResponseMessage(exception.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleUnexpected(Exception exception) {
        log.error("Unhandled server error", exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(buildResponseMessage("Unexpected server error"));
    }

    private String buildResponseMessage(String message) {
        String requestId = MDC.get("requestId");
        if (requestId == null || requestId.isBlank()) {
            return message;
        }

        return message + " [requestId=" + requestId + "]";
    }
}
