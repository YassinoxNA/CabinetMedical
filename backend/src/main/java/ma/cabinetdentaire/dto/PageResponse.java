package ma.cabinetdentaire.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Stable API representation of a paginated result.
 *
 * <p>Spring Data's {@code PageImpl} is an internal implementation whose JSON
 * structure is not guaranteed. This DTO deliberately exposes only the fields
 * used by the desktop application.</p>
 */
public record PageResponse<T>(
        List<T> content,
        long totalElements,
        int totalPages,
        int number,
        int size
) {

    public PageResponse {
        content = List.copyOf(content);
    }

    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(
                page.getContent(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.getNumber(),
                page.getSize()
        );
    }
}
