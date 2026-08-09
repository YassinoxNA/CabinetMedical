!macro customInstall
  CreateShortCut "$DESKTOP\Cabinet Dentaire.lnk" "$INSTDIR\Cabinet Dentaire.exe" "" "$INSTDIR\resources\branding\icon.ico" 0
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Cabinet Dentaire - Reseau local"'
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Cabinet Dentaire - Reseau local" dir=in action=allow protocol=TCP localport=8080 profile=private,public'
!macroend

!macro customUnInstall
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Cabinet Dentaire - Reseau local"'
!macroend
