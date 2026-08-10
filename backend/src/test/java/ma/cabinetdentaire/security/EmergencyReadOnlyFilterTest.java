package ma.cabinetdentaire.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class EmergencyReadOnlyFilterTest {

    @Test
    void blocksMedicalWritesWhenEmergencyMirrorIsActive() throws Exception {
        var filter = new EmergencyReadOnlyFilter(true);
        var request = new MockHttpServletRequest("POST", "/api/v1/patients");
        var response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(423);
        assertThat(response.getContentAsString()).contains("EMERGENCY_READ_ONLY");
        verify(chain, never()).doFilter(request, response);
    }

    @Test
    void stillAllowsReadingAndLogin() throws Exception {
        var filter = new EmergencyReadOnlyFilter(true);
        FilterChain chain = mock(FilterChain.class);
        var read = new MockHttpServletRequest("GET", "/api/v1/patients");
        var login = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        var readResponse = new MockHttpServletResponse();
        var loginResponse = new MockHttpServletResponse();

        filter.doFilter(read, readResponse, chain);
        filter.doFilter(login, loginResponse, chain);

        verify(chain).doFilter(read, readResponse);
        verify(chain).doFilter(login, loginResponse);
    }
}
