package ma.cabinetdentaire.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PageResponseTest {

    @Test
    void preservesContentAndPaginationMetadata() {
        var source = new PageImpl<>(List.of("patient-1", "patient-2"), PageRequest.of(2, 5), 17);

        PageResponse<String> response = PageResponse.from(source);

        assertThat(response.content()).containsExactly("patient-1", "patient-2");
        assertThat(response.totalElements()).isEqualTo(17);
        assertThat(response.totalPages()).isEqualTo(4);
        assertThat(response.number()).isEqualTo(2);
        assertThat(response.size()).isEqualTo(5);
    }

    @Test
    void serializesOnlyTheStableFrontendContract() {
        var response = PageResponse.from(
                new PageImpl<>(List.of("patient-1"), PageRequest.of(0, 20), 1)
        );

        JsonNode json = new ObjectMapper().valueToTree(response);
        List<String> fields = new ArrayList<>();
        json.fieldNames().forEachRemaining(fields::add);

        assertThat(fields).containsExactlyInAnyOrder(
                "content", "totalElements", "totalPages", "number", "size"
        );
        assertThat(json.path("content").get(0).asText()).isEqualTo("patient-1");
        assertThat(json.path("totalElements").asLong()).isEqualTo(1);
        assertThat(json.path("totalPages").asInt()).isEqualTo(1);
        assertThat(json.path("number").asInt()).isZero();
        assertThat(json.path("size").asInt()).isEqualTo(20);
        assertThat(json.has("pageable")).isFalse();
        assertThat(json.has("sort")).isFalse();
    }
}
