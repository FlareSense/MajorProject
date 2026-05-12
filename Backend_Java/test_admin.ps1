$ErrorActionPreference = "Stop"
try {
    Write-Host "Registering..."
    $regResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/register" -Method Post -Body '{"username":"testadmin5","password":"password","email":"test5@admin.com"}' -ContentType "application/json"
} catch {}

try {
    Write-Host "Logging in..."
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body '{"username":"testadmin5","password":"password"}' -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "Token: $token"

    Write-Host "Executing Admin call..."
    $header = @{ Authorization = "Bearer $token" }
    $adminResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/users" -Method Get -Headers $header
    Write-Host "Success! Response:"
    $adminResponse | ConvertTo-Json -Depth 1
} catch {
    Write-Host "Caught Exception: $($_.Exception.Message)"
    if ($_.ErrorDetails) {
        Write-Host "Error Details: $($_.ErrorDetails.Message)"
    }
    
    # Let's inspect the actual response from the server further to see headers/etc
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)"
    }
}
