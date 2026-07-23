param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\assets\images')
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$olive = [System.Drawing.ColorTranslator]::FromHtml('#8A9900')
$ivory = [System.Drawing.ColorTranslator]::FromHtml('#F9F7F0')
$monochrome = [System.Drawing.Color]::Black
$transparent = [System.Drawing.Color]::Transparent

function New-DavaineMark {
  param(
    [int]$CanvasSize,
    [double]$MarkWidth,
    [System.Drawing.Color]$MarkColor,
    [bool]$IncludeBackground
  )

  $bitmap = [System.Drawing.Bitmap]::new(
    $CanvasSize,
    $CanvasSize,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality =
      [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.Clear($(if ($IncludeBackground) { $ivory } else { $transparent }))

    $scale = $MarkWidth / 282
    $markHeight = 280 * $scale
    $offsetX = ($CanvasSize - $MarkWidth) / 2
    $offsetY = ($CanvasSize - $markHeight) / 2
    $transform = [System.Drawing.Drawing2D.Matrix]::new(
      [single]$scale,
      0,
      0,
      [single]$scale,
      [single]$offsetX,
      [single]$offsetY
    )

    $outerPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $outerPath.StartFigure()
    $outerPath.AddLine(23, 0, 116, 0)
    $outerPath.AddBezier(116, 0, 207.68, 0, 282, 62.68, 282, 140)
    $outerPath.AddBezier(282, 140, 282, 217.32, 207.68, 280, 116, 280)
    $outerPath.AddLine(116, 280, 23, 280)
    $outerPath.AddBezier(23, 280, 10.3, 280, 0, 269.7, 0, 257)
    $outerPath.AddLine(0, 257, 0, 23)
    $outerPath.AddBezier(0, 23, 0, 10.3, 10.3, 0, 23, 0)
    $outerPath.CloseFigure()
    $outerPath.Transform($transform)

    $markBrush = [System.Drawing.SolidBrush]::new($MarkColor)
    $graphics.FillPath($markBrush, $outerPath)

    $cutouts = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $cutouts.AddRectangle([System.Drawing.RectangleF]::new(96, 69, 31, 37))
    $cutouts.AddRectangle([System.Drawing.RectangleF]::new(141, 69, 31, 37))
    $cutouts.AddRectangle([System.Drawing.RectangleF]::new(96, 149, 76, 98))
    $cutouts.Transform($transform)

    $previousCompositingMode = $graphics.CompositingMode
    if ($IncludeBackground) {
      $cutoutBrush = [System.Drawing.SolidBrush]::new($ivory)
    } else {
      $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
      $cutoutBrush = [System.Drawing.SolidBrush]::new($transparent)
    }
    $graphics.FillPath($cutoutBrush, $cutouts)
    $graphics.CompositingMode = $previousCompositingMode

    $knobDiameter = 17 * $scale
    $knobX = $offsetX + ((113 - 8.5) * $scale)
    $knobY = $offsetY + ((200 - 8.5) * $scale)
    $graphics.FillEllipse(
      $markBrush,
      [single]$knobX,
      [single]$knobY,
      [single]$knobDiameter,
      [single]$knobDiameter
    )

    return $bitmap
  } finally {
    if ($null -ne $cutoutBrush) { $cutoutBrush.Dispose() }
    if ($null -ne $cutouts) { $cutouts.Dispose() }
    if ($null -ne $markBrush) { $markBrush.Dispose() }
    if ($null -ne $outerPath) { $outerPath.Dispose() }
    if ($null -ne $transform) { $transform.Dispose() }
    $graphics.Dispose()
  }
}

function Save-DavaineAsset {
  param(
    [string]$Name,
    [int]$CanvasSize,
    [double]$MarkWidth,
    [System.Drawing.Color]$MarkColor,
    [bool]$IncludeBackground
  )

  $bitmap = New-DavaineMark `
    -CanvasSize $CanvasSize `
    -MarkWidth $MarkWidth `
    -MarkColor $MarkColor `
    -IncludeBackground $IncludeBackground

  try {
    $path = Join-Path $OutputDirectory $Name
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "Generated $path"
  } finally {
    $bitmap.Dispose()
  }
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

# iOS, Expo Go, and legacy Android icon.
Save-DavaineAsset 'icon.png' 1024 600 $olive $true

# Android adaptive icon layers. The smaller mark stays inside adaptive-mask safe areas.
Save-DavaineAsset 'android-icon-foreground.png' 1024 520 $olive $false
Save-DavaineAsset 'android-icon-monochrome.png' 1024 520 $monochrome $false

# Web browser and splash-screen assets.
Save-DavaineAsset 'favicon.png' 64 46 $olive $true
Save-DavaineAsset 'splash-icon.png' 512 420 $olive $false
