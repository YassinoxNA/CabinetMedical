package ma.cabinetdentaire.entity;
import jakarta.persistence.*;import java.time.Instant;import java.util.UUID;
@Entity @Table(name="settings")
public class Setting {
 @Id @Column(name="setting_key",length=120) private String key;@Column(name="setting_value",columnDefinition="text") private String value;
 @Column(name="value_type",nullable=false,length=30) private String valueType;@Column(nullable=false) private boolean sensitive;
 @Column(name="updated_at",nullable=false) private Instant updatedAt;@Column(name="updated_by") private UUID updatedBy;
 protected Setting(){}public Setting(String key,String value,String type,boolean sensitive,UUID actor){this.key=key;this.value=value;valueType=type;this.sensitive=sensitive;updatedBy=actor;updatedAt=Instant.now();}
 public void update(String value,UUID actor){this.value=value;updatedBy=actor;updatedAt=Instant.now();}
 public String getKey(){return key;}public String getValue(){return value;}public String getValueType(){return valueType;}public boolean isSensitive(){return sensitive;}public Instant getUpdatedAt(){return updatedAt;}
}
