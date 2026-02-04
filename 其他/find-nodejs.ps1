# Auto find Node.js installation path

Write-Host "Searching for Node.js..." -ForegroundColor Yellow
Write-Host ""

$nodePath = $null

# Method 1: Try where.exe (if in system PATH)
try {
    $whereResult = where.exe node 2>$null
    if ($whereResult) {
        $fullPath = $whereResult | Select-Object -First 1
        if ($fullPath) {
            $nodePath = Split-Path $fullPath -Parent
            Write-Host "Found via where.exe: $nodePath" -ForegroundColor Green
        }
    }
} catch {
    # Ignore
}

# Method 2: Check common installation paths
if (-not $nodePath) {
    $commonPaths = @(
        "$env:ProgramFiles\nodejs",
        "${env:ProgramFiles(x86)}\nodejs",
        "$env:LOCALAPPDATA\Programs\nodejs",
        "C:\Program Files\nodejs",
        "C:\Program Files (x86)\nodejs",
        "$env:USERPROFILE\AppData\Local\Programs\nodejs"
    )
    
    foreach ($p in $commonPaths) {
        if (Test-Path "$p\node.exe") {
            $nodePath = $p
            Write-Host "Found in common path: $nodePath" -ForegroundColor Green
            break
        }
    }
}

# Method 3: Check registry
if (-not $nodePath) {
    try {
        $regPaths = @(
            "HKLM:\SOFTWARE\Node.js",
            "HKLM:\SOFTWARE\WOW6432Node\Node.js"
        )
        
        foreach ($regPath in $regPaths) {
            if (Test-Path $regPath) {
                $reg = Get-ItemProperty $regPath -ErrorAction SilentlyContinue
                if ($reg -and $reg.InstallPath) {
                    $p = $reg.InstallPath
                    if (Test-Path "$p\node.exe") {
                        $nodePath = $p
                        Write-Host "Found in registry: $nodePath" -ForegroundColor Green
                        break
                    }
                }
            }
        }
    } catch {
        # Ignore
    }
}

# Method 4: Search in Program Files
if (-not $nodePath) {
    Write-Host "Searching Program Files..." -ForegroundColor Yellow
    $searchPaths = @(
        $env:ProgramFiles,
        ${env:ProgramFiles(x86)},
        "$env:LOCALAPPDATA\Programs"
    )
    
    foreach ($basePath in $searchPaths) {
        if (Test-Path $basePath) {
            try {
                $found = Get-ChildItem -Path $basePath -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($found) {
                    $nodePath = $found.DirectoryName
                    Write-Host "Found by searching: $nodePath" -ForegroundColor Green
                    break
                }
            } catch {
                # Ignore
            }
        }
    }
}

# Display result
Write-Host ""
if ($nodePath) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Node.js Found!" -ForegroundColor Green
    Write-Host "Path: $nodePath" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Add to PATH
    Write-Host "Adding to PATH..." -ForegroundColor Yellow
    $env:PATH = "$nodePath;$env:PATH"
    
    # Verify
    Write-Host "Verifying..." -ForegroundColor Yellow
    try {
        $nodeVer = & "$nodePath\node.exe" --version 2>&1
        $npmVer = & "$nodePath\npm.cmd" --version 2>&1
        
        if ($nodeVer -and $npmVer) {
            Write-Host ""
            Write-Host "Success!" -ForegroundColor Green
            Write-Host "Node.js: $nodeVer" -ForegroundColor Green
            Write-Host "npm: $npmVer" -ForegroundColor Green
            Write-Host ""
            Write-Host "You can now run:" -ForegroundColor Yellow
            Write-Host "  npm install" -ForegroundColor White
            Write-Host "  npm start" -ForegroundColor White
        }
    } catch {
        Write-Host "Verification failed, but PATH is set." -ForegroundColor Yellow
        Write-Host "Try running: node --version" -ForegroundColor Yellow
    }
} else {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Node.js Not Found!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js from:" -ForegroundColor Yellow
    Write-Host "  https://nodejs.org/" -ForegroundColor White
    Write-Host ""
    Write-Host "Or if Node.js is installed, please provide the path:" -ForegroundColor Yellow
    $manualPath = Read-Host "Enter Node.js path"
    
    if ($manualPath -and (Test-Path "$manualPath\node.exe")) {
        $env:PATH = "$manualPath;$env:PATH"
        Write-Host "Added to PATH: $manualPath" -ForegroundColor Green
    } else {
        Write-Host "Invalid path or node.exe not found" -ForegroundColor Red
    }
}
