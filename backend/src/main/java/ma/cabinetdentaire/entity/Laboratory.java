package ma.cabinetdentaire.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "laboratories")
public class Laboratory extends BaseEntity {
    @Column(nullable = false, unique = true, length = 180) private String name;
    @Column(name = "manager_name", length = 180) private String managerName;
    @Column(length = 30) private String phone;
    @Column(length = 160) private String email;
    private String address;
    @Column(length = 100) private String city;
    @Column(name = "tax_identifier", length = 80) private String taxIdentifier;
    @Column(columnDefinition = "text") private String observations;
    @Column(nullable = false) private boolean active;
    protected Laboratory() {}
    public Laboratory(String name, String managerName, String phone, String email, String address,
                      String city, String taxIdentifier, String observations) {
        this.name = name.trim(); this.managerName = clean(managerName); this.phone = clean(phone);
        this.email = clean(email); this.address = clean(address); this.city = clean(city);
        this.taxIdentifier = clean(taxIdentifier); this.observations = clean(observations); this.active = true;
    }
    private String clean(String v) { return v == null || v.isBlank() ? null : v.trim(); }
    public void update(String name, String managerName, String phone, String email, String address,
                       String city, String taxIdentifier, String observations) {
        this.name = name.trim();
        this.managerName = clean(managerName);
        this.phone = clean(phone);
        this.email = clean(email);
        this.address = clean(address);
        this.city = clean(city);
        this.taxIdentifier = clean(taxIdentifier);
        this.observations = clean(observations);
    }
    public void deactivate() { this.active = false; }
    public String getName() { return name; } public String getManagerName() { return managerName; }
    public String getPhone() { return phone; } public String getEmail() { return email; }
    public String getAddress() { return address; } public String getCity() { return city; }
    public String getTaxIdentifier() { return taxIdentifier; }
    public String getObservations() { return observations; } public boolean isActive() { return active; }
}
