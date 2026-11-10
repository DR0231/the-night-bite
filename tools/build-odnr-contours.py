#!/usr/bin/env python3
"""Build a static, self-hosted ODNR depth-contour map.

Usage: python3 tools/build-odnr-contours.py --lake hoover
       python3 tools/build-odnr-contours.py --lake hoover --download

Only Hoover has written ODNR publication permission. --download refreshes the
retained raw GeoJSON. Without it, rendering is offline and deterministic.

Build dependencies: Pillow, Shapely, pyproj, poppler-utils (pdftoppm), Chrome.
The official ODNR PDF and its stream-channel vectors are retained as static
build inputs. The page loads only the generated SVG/WebP, never ODNR or a PDF.
"""
import argparse
import base64
import datetime as dt
import http.server
import json
import pathlib
import socketserver
import subprocess
import threading
import urllib.parse
import urllib.request

from PIL import Image

from shapely import make_valid
from shapely.geometry import Polygon, shape
from shapely.ops import unary_union

ROOT = pathlib.Path(__file__).resolve().parent.parent
LAKES = {"hoover": "Hoover Reservoir"}
SERVICES = {
    "bathymetry": "https://gis2.ohiodnr.gov/ArcGIS/rest/services/DOW_Services/DOW_Lakes_Bathymetry/MapServer/0/query",
    "lake-background": "https://gis2.ohiodnr.gov/ArcGIS/rest/services/DOW_Services/DOW_LakeFishing/MapServer/20/query",
}
def download(lake):
    folder = ROOT / "data" / "odnr" / lake
    folder.mkdir(parents=True, exist_ok=True)
    urls = {}
    for name, service in SERVICES.items():
        query = urllib.parse.urlencode({
            "where": f"upper(LAKE_NAME) = '{LAKES[lake].upper()}'",
            "outFields": "*", "returnGeometry": "true", "outSR": "4326", "f": "geojson",
        })
        url = service + "?" + query
        with urllib.request.urlopen(url, timeout=60) as response:
            raw = response.read()
        data = json.loads(raw)
        if not data.get("features"):
            raise RuntimeError(f"ODNR returned no {name} features for {lake}")
        (folder / f"{name}.geojson").write_bytes(raw)
        urls[name] = url
    metadata = {
        "lake": LAKES[lake],
        "accessed": dt.date.today().isoformat(),
        "sources": urls,
        "depth_units": "feet; 10 ft contour intervals, confirmed by the official Hoover fishing map PDF",
        "fishing_map_pdf": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/hooverreservoir2.pdf",
        "fishing_map_revision": "2010",
        "reservoir_last_surveyed": "2001",
        "normal_summer_pool_ft": 894,
        "notes": [
            "The ODNR bathymetry service has no survey-date field. Its Hoover DT_ADDED value is June 10, 2014.",
            "The survey and revision years above are printed on the linked official ODNR Hoover fishing map PDF.",
            "Written ODNR permission applies to Hoover only. Never render another lake without its own permission.",
        ],
    }
    (folder / "source.json").write_text(json.dumps(metadata, indent=2) + "\n")
    return metadata


def lines(geometry):
    if geometry["type"] == "LineString":
        return [geometry["coordinates"]]
    if geometry["type"] == "MultiLineString":
        return geometry["coordinates"]
    return []


def render(lake):
    '''Redraw ODNR's own map with depth bands from its published contours.

    The PDF supplies only roads, labels and orientation furniture. The blue
    polygons come from the retained GIS contour lines, never from interpolation.
    The few source rings with self-crossings are repaired with GEOS, not redrawn.
    '''
    folder = ROOT / "data" / "odnr" / lake
    contour_data = json.loads((folder / "bathymetry.geojson").read_text())
    background_data = json.loads((folder / "lake-background.geojson").read_text())
    shore = shape(background_data["features"][0]["geometry"])
    contour_paths, depths = [], {}
    for feature in contour_data["features"]:
        # ODNR stores depth as negative values below normal summer pool.
        depth = abs(int(feature["properties"]["DEPTH"]))
        depths[depth] = depths.get(depth, 0) + 1
        for path in lines(feature["geometry"]):
            contour_paths.append((depth, path))
    if sorted(depths) != [10, 20, 30, 40, 50, 60]:
        raise RuntimeError("Unexpected Hoover depth set; refusing to imply new contour values")

    def polygon_parts(geometry):
        if geometry.is_empty:
            return []
        if geometry.geom_type == "Polygon":
            return [geometry]
        if hasattr(geometry, "geoms"):
            return [part for item in geometry.geoms for part in polygon_parts(item)]
        return []

    depth_polygons = {}
    for depth in sorted(depths):
        polygons = []
        for value, coords in contour_paths:
            if value != depth:
                continue
            ring = list(coords)
            if ring[0] != ring[-1]:
                ring.append(ring[0])
            polygons.extend(polygon_parts(make_valid(Polygon(ring))))
        merged = unary_union(polygons).intersection(shore)
        if merged.is_empty or not merged.is_valid:
            raise RuntimeError(f"Invalid ODNR {depth} ft depth polygon")
        depth_polygons[depth] = merged

    # ODNR's printed UTM NAD83 Zone 17 grid gives a precise north-up transform.
    # x/y below are PDF points, not guessed screen coordinates.
    def pdf_point(lon, lat):
        import pyproj
        easting, northing = pyproj.Transformer.from_crs(4326, 32617, always_xy=True).transform(lon, lat)
        return (37.20280075073242 + (easting - 334000) * (125.76947021484375 - 37.20280075073242) / 1000,
                103.43505859375 + (4453000 - northing) * (191.99072265625 - 103.43505859375) / 1000)

    map_pdf = folder / "pdf" / f"odnr-{lake}-fishing-map-2010.pdf"
    if not map_pdf.exists():
        raise RuntimeError("Retain the official ODNR PDF before rendering; do not substitute another chart")
    clip_x, clip_y, clip_right, clip_bottom = 280, 20, 777, 1140
    scale = 2
    W, H = round((clip_right - clip_x) * scale), round((clip_bottom - clip_y) * scale)

    def canvas_point(lon, lat):
        x, y = pdf_point(lon, lat)
        return ((x - clip_x) * scale, (y - clip_y) * scale)

    def geo_path(coords, close=False):
        pts = [canvas_point(*p) for p in coords]
        return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + (" Z" if close else "")

    def geometry_paths(geometry):
        paths = []
        for polygon in polygon_parts(geometry):
            paths.append(geo_path(list(polygon.exterior.coords), True))
            paths.extend(geo_path(list(ring.coords), True) for ring in polygon.interiors)
        return paths

    colors = {0: "#c9eaf5", 10: "#a8d8ed", 20: "#82c2e2", 30: "#5aa7d2", 40: "#3988ba", 50: "#246a9e", 60: "#174e7d"}
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img">',
           '<title>Hoover Reservoir depth contours, ODNR fishing map</title>',
           '<rect width="100%" height="100%" fill="#e0e0e0"/>']
    # Nested polygons: shore to 10, 10 to 20, and so on through 60 ft.
    svg.append(f'<path d="{" ".join(geometry_paths(shore))}" fill="{colors[0]}" fill-rule="evenodd"/>')
    for depth, polygon in depth_polygons.items():
        svg.append(f'<path d="{" ".join(geometry_paths(polygon))}" fill="{colors[depth]}" fill-rule="evenodd"/>')

    # Render ODNR's own small contour labels, roads, place names, dam, access
    # symbols, north arrow, and revision mark. Its pale base water is excluded.
    # Reinsert the old stream channels below the official text and facilities.
    stream_data = json.loads((folder / "odnr-map-stream-channels.json").read_text())
    streams = []
    for x1, y1, x2, y2 in stream_data["segments"]:
        streams.append(f'M{(x1-clip_x)*scale:.1f},{(y1-clip_y)*scale:.1f} L{(x2-clip_x)*scale:.1f},{(y2-clip_y)*scale:.1f}')
    svg.append(f'<path d="{" ".join(streams)}" fill="none" stroke="#147faf" stroke-width="1.2" stroke-opacity="0.68"/>')
    svg.append(f'<image href="odnr-map-base.png" x="0" y="0" width="{W}" height="{H}"/>')

    # All pins are the site's retained, official-source coordinates. Labels are
    # names already in js/hoover-map-data.js, not commercial chart labels.
    ramps = [
        ("oxbow", "Oxbow Road", -82.88609, 40.18429, -150, -25),
        ("sunbury", "Sunbury Road", -82.874401, 40.175435, -35, 43),
        ("twin", "Twin Bridges", -82.8606, 40.17504, 25, 48),
        ("redbank", "Red Bank", -82.88003, 40.14681, 29, 42),
        ("walnut", "Walnut Street", -82.88599, 40.12191, 28, 43),
    ]
    svg.append('<g font-family="Arial,Helvetica,sans-serif" font-size="17" font-weight="700" fill="#102b3d" stroke-linejoin="round">')
    for ident, name, lon, lat, dx, dy in ramps:
        x, y = canvas_point(lon, lat)
        tx, ty = x + dx, y + dy
        anchor = "end" if dx < 0 else "start"
        svg.append(f'<path d="M{x:.1f},{y:.1f} L{tx:.1f},{ty-5:.1f}" fill="none" stroke="#102b3d" stroke-width="2"/>')
        svg.append(f'<circle id="ramp-{ident}" cx="{x:.1f}" cy="{y:.1f}" r="10" fill="#f7f3e8" stroke="#123d5a" stroke-width="3"/>')
        svg.append(f'<path d="M{x-6:.1f},{y+3:.1f} L{x+6:.1f},{y+3:.1f} L{x+3:.1f},{y+7:.1f} L{x-3:.1f},{y+7:.1f} Z M{x-3:.1f},{y-5:.1f} L{x+4:.1f},{y-5:.1f} L{x+6:.1f},{y+1:.1f} L{x-5:.1f},{y+1:.1f} Z" fill="#123d5a"/>')
        svg.append(f'<text x="{tx:.1f}" y="{ty:.1f}" text-anchor="{anchor}" stroke="#f7f3e8" stroke-width="5" paint-order="stroke">{name}</text>')
    svg.append('</g>')

    # A new scale in the cropped margin, computed from the PDF's metric grid.
    bar_miles = 0.5
    bar_length = bar_miles * 1609.344 * (125.76947021484375 - 37.20280075073242) / 1000 * scale
    x0, y0 = 28, H - 44
    svg.append('<g font-family="Arial,Helvetica,sans-serif" font-size="17" fill="#172a36">')
    svg.append(f'<rect x="12" y="{y0-47}" width="{bar_length+32:.1f}" height="76" fill="#f7f3e8" fill-opacity="0.92"/>')
    svg.append(f'<path d="M{x0},{y0} h{bar_length/2:.1f} v-10 h{bar_length/2:.1f} v10 h-{bar_length:.1f} Z" fill="#172a36"/>')
    svg.append(f'<path d="M{x0},{y0} v-16 M{x0+bar_length/2:.1f},{y0} v-16 M{x0+bar_length:.1f},{y0} v-16" fill="none" stroke="#172a36" stroke-width="2"/>')
    svg.append(f'<text x="{x0}" y="{y0-22}" text-anchor="middle">0</text><text x="{x0+bar_length/2:.1f}" y="{y0-22}" text-anchor="middle">0.25</text><text x="{x0+bar_length:.1f}" y="{y0-22}" text-anchor="middle">0.5 mi</text>')
    svg.append('</g>')
    svg.append('</svg>')

    out = ROOT / "assets" / "maps"
    out.mkdir(parents=True, exist_ok=True)
    svg_path = out / f"{lake}-depth-contours.svg"
    svg_path.write_text("\n".join(svg) + "\n")
    base_png = out / f"{lake}-odnr-map-base.png"

    # Chromium's PDF viewer is unsuitable for pixel extraction, so render the
    # source PDF directly with pdftoppm. The official water fill is made
    # transparent only where it is already the map's flat pale-blue backdrop.
    base_raw = folder / "pdf" / "base-raw.png"
    subprocess.run(["pdftoppm", "-f", "1", "-singlefile", "-r", "144", "-x", str(clip_x*scale), "-y", str(clip_y*scale), "-W", str(W), "-H", str(H), "-png", str(map_pdf), str(base_raw.with_suffix(""))], check=True)
    base = Image.open(base_raw).convert("RGBA")
    # ODNR's flat base water is RGB (151, 219, 242). Remove that backdrop
    # and its antialiased blend with white, leaving the official dark contours.
    pixels = base.load()
    for yy in range(base.height):
        for xx in range(base.width):
            r, g, b, a = pixels[xx, yy]
            if r == 151 and g == 219 and b == 242:
                pixels[xx, yy] = (r, g, b, 0)
            elif b > 235 and g > 205 and 140 < r < 225 and b-r > 15:
                # Fade only the pale-blue antialiasing, not blue labels or icons.
                alpha = max(0, min(255, round(255 * (225-r) / 74)))
                pixels[xx, yy] = (r, g, b, alpha)
    base.save(base_png, optimize=True)
    base_raw.unlink()
    embedded = base64.b64encode(base_png.read_bytes()).decode("ascii")
    svg = [line.replace('href="odnr-map-base.png"', f'href="data:image/png;base64,{embedded}"') if '<image href="odnr-map-base.png"' in line else line for line in svg]
    svg_path.write_text("\n".join(svg) + "\n")

    # Screenshot the static SVG offline through localhost. No map service or
    # browser runtime is shipped to the page; this only creates the WebP image.
    shot = folder / "pdf" / "map-render.png"
    handler = lambda *args, **kwargs: http.server.SimpleHTTPRequestHandler(*args, directory=str(ROOT), **kwargs)
    with socketserver.TCPServer(("127.0.0.1", 0), handler) as server:
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        url = f"http://127.0.0.1:{server.server_address[1]}/{svg_path.relative_to(ROOT).as_posix()}"
        subprocess.run(["/usr/bin/google-chrome", "--headless", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", f"--screenshot={shot}", f"--window-size={W},{H}", url], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        server.shutdown()
        thread.join()
    image = Image.open(shot).convert("RGB")
    if image.size != (W, H):
        raise RuntimeError(f"Unexpected map render size {image.size}")
    image.save(out / f"{lake}-depth-contours.webp", "WEBP", quality=91, method=6)
    shot.unlink()
    print(f"{lake}: {len(contour_paths)} contour parts, six real depth bands, {len(ramps)} named ramps")
    print(f"Wrote {svg_path}, {base_png.name}, and WebP fallback ({W} x {H})")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lake", required=True, choices=LAKES)
    parser.add_argument("--download", action="store_true", help="refresh retained raw ODNR GeoJSON before rendering")
    args = parser.parse_args()
    if args.download:
        download(args.lake)
    render(args.lake)


if __name__ == "__main__":
    main()
