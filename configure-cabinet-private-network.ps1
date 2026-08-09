$ErrorActionPreference = "Stop"

$interfaceAlias = "Wi-Fi"
$ruleName = "Cabinet Dentaire - Reseau local prive"
$resultPath = "D:\Cabinet Medical\network-config-status.json"

try {
    Set-NetConnectionProfile -InterfaceAlias $interfaceAlias -NetworkCategory Private

    $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if ($existingRule) {
        Set-NetFirewallRule -DisplayName $ruleName -Enabled True -Profile Private -Direction Inbound -Action Allow
        Set-NetFirewallAddressFilter -AssociatedNetFirewallRule $existingRule -RemoteAddress LocalSubnet
        Set-NetFirewallPortFilter -AssociatedNetFirewallRule $existingRule -Protocol TCP -LocalPort 8080
    } else {
        New-NetFirewallRule `
            -DisplayName $ruleName `
            -Description "Cabinet Dentaire: acces au serveur uniquement depuis le sous-reseau local prive." `
            -Direction Inbound `
            -Action Allow `
            -Protocol TCP `
            -LocalPort 8080 `
            -Profile Private `
            -RemoteAddress LocalSubnet | Out-Null
    }

    $profile = Get-NetConnectionProfile -InterfaceAlias $interfaceAlias
    $rule = Get-NetFirewallRule -DisplayName $ruleName
    $port = $rule | Get-NetFirewallPortFilter
    $address = $rule | Get-NetFirewallAddressFilter
    @{
        success = $true
        networkCategory = [string]$profile.NetworkCategory
        enabled = [bool]$rule.Enabled
        profile = [string]$rule.Profile
        localPort = [string]$port.LocalPort
        remoteAddress = @($address.RemoteAddress)
    } | ConvertTo-Json | Set-Content -LiteralPath $resultPath -Encoding UTF8
} catch {
    @{
        success = $false
        message = $_.Exception.Message
    } | ConvertTo-Json | Set-Content -LiteralPath $resultPath -Encoding UTF8
    exit 1
}
