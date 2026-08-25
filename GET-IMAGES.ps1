$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
$out = Join-Path $root "_images"
if (-not (Test-Path $out)) { New-Item -ItemType Directory -Path $out | Out-Null }
$log = Join-Path $root "images-log.txt"
"=== scrape started $(Get-Date) ===" | Set-Content -Path $log -Encoding UTF8
"powershell $($PSVersionTable.PSVersion)" | Add-Content -Path $log -Encoding UTF8

# Plain ASCII throughout, on purpose. Windows PowerShell 5.1 reads a .ps1 as the
# system ANSI codepage unless the file carries a UTF-8 BOM; the previous version
# had Hebrew in it and every string came out as mojibake, one of which happened
# to break the parser. The file has a BOM now as well, but belt and braces.
$page = "https://bite.co.il/%d7%9e%d7%97%d7%99%d7%a8%d7%95%d7%9f/"
Write-Host "  Downloading the price page..."
$html = (Invoke-WebRequest -Uri $page -UseBasicParsing -TimeoutSec 60).Content
"page bytes: $($html.Length)" | Add-Content -Path $log -Encoding UTF8

# The pattern uses \S so it needs no quote characters of its own.
$pattern = 'https://bite\.co\.il/wp-content/uploads/\S+?\.(?:png|jpe?g|webp)'
$all = [regex]::Matches($html, $pattern) | ForEach-Object { $_.Value }
$all = $all | Where-Object { $_ -notmatch '-\d+x\d+\.(png|jpe?g|webp)$' }

$seen = New-Object System.Collections.Generic.HashSet[string]
$urls = @()
foreach ($u in $all) { if ($seen.Add($u)) { $urls += $u } }

Write-Host ("  Found {0} images" -f $urls.Count)
"found: $($urls.Count)" | Add-Content -Path $log -Encoding UTF8

$map = @()
$ok = 0
$i = 0
foreach ($u in $urls) {
  $i++
  $clean = ($u -split '\?')[0]
  $ext = [System.IO.Path]::GetExtension($clean)
  $name = "{0:D3}{1}" -f $i, $ext
  $dest = Join-Path $out $name
  try {
    Invoke-WebRequest -Uri $u -OutFile $dest -UseBasicParsing -TimeoutSec 60
    $size = (Get-Item $dest).Length
    $ok++
    Write-Host ("  [{0}/{1}] {2}  {3} KB" -f $i, $urls.Count, $name, [int]($size/1KB))
    $map += ("{0}`t{1}`t{2}" -f $name, $size, $u)
  } catch {
    Write-Host ("  [{0}/{1}] {2}  FAILED" -f $i, $urls.Count, $name)
    $map += ("{0}`tFAILED`t{1}" -f $name, $u)
  }
}
$map | Set-Content -Path (Join-Path $out "map.txt") -Encoding UTF8
"=== done $(Get-Date) ===" | Add-Content -Path $log -Encoding UTF8
Write-Host ""
Write-Host ("  Done. {0} of {1} downloaded." -f $ok, $urls.Count)
