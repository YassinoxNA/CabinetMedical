package ma.cabinetdentaire.service;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class TemporaryPasswordGenerator {

    private static final String LOWER = "abcdefghijkmnopqrstuvwxyz";
    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String DIGITS = "23456789";
    private static final String SYMBOLS = "!@#$%*-_";
    private static final String ALL = LOWER + UPPER + DIGITS + SYMBOLS;

    private final SecureRandom random = new SecureRandom();

    public String generate() {
        List<Character> characters = new ArrayList<>();
        characters.add(randomFrom(LOWER));
        characters.add(randomFrom(UPPER));
        characters.add(randomFrom(DIGITS));
        characters.add(randomFrom(SYMBOLS));
        while (characters.size() < 20) {
            characters.add(randomFrom(ALL));
        }
        Collections.shuffle(characters, random);
        StringBuilder password = new StringBuilder(characters.size());
        characters.forEach(password::append);
        return password.toString();
    }

    private char randomFrom(String source) {
        return source.charAt(random.nextInt(source.length()));
    }
}
