Add-Type -AssemblyName System.Drawing

function New-Icon($size, $path, $padRatio) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $c1 = [System.Drawing.Color]::FromArgb(139, 92, 246)
    $c2 = [System.Drawing.Color]::FromArgb(244, 114, 182)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $c1, $c2, 45
    $g.FillRectangle($brush, $rect)
    # éclair vectoriel (mêmes proportions que le bolt SVG de l'app, viewBox 24)
    $pad = [int]($size * $padRatio)
    $scale = ($size - 2 * $pad) / 24.0
    $bolt24 = @(
      @(13.6, 1.5), @(4.2, 13.6), @(9.8, 13.6), @(8.6, 22.5), @(18.0, 10.4), @(12.4, 10.4)
    )
    $points = @()
    foreach ($p in $bolt24) {
      $points += [System.Drawing.PointF]::new($pad + $p[0] * $scale, $pad + $p[1] * $scale)
    }
    $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $g.FillPolygon($white, $points)
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose(); $brush.Dispose(); $white.Dispose()
}

Set-Location 'C:\Users\Joris\Downloads\QUIZZWALLAH'
New-Icon 192 'public\icons\icon-192.png' 0.06
New-Icon 512 'public\icons\icon-512.png' 0.06
New-Icon 512 'public\icons\icon-maskable-512.png' 0.24
New-Icon 180 'public\icons\apple-touch-icon.png' 0.06
Get-ChildItem 'public\icons' | Select-Object Name, Length
