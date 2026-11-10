#!/usr/bin/env python3
"""Builds stocking.html (Stocking & surveys) from ODNR public PDFs. Values typed from the PDF tables and checked against
the rendered PDFs, Oct. 27, 2026 (Indian Lake and Delaware Lake: Oct. 29, 2026, from pdftotext -layout of the same PDFs). The six east and
southeast lakes (Seneca, Dillon, Logan, Salt Fork, Burr Oak, Dow) come from ODNR's Fish Stocking dashboard, read Oct. 31, 2026; the six northeast lakes (Mosquito Creek, Berlin, West Branch, Pymatuning, Lake Milton, Leesville) Nov. 3, 2026. Reuses ice.html's head and footer. Run, then tools/stamp-version.py."""
import pathlib, re
R = pathlib.Path(__file__).resolve().parent.parent
ice = (R / "ice.html").read_text()
head = ice[:ice.index("  <main id=\"main\">")]
foot = ice[ice.index("  </main>"):]
head = re.sub(r"<title>[^<]*</title>", "<title>Stocking &amp; surveys: Ohio lakes | The Night Bite</title>", head, count=1)
head = re.sub(r'<meta name="description" content="[^"]*">',
              '<meta name="description" content="ODNR stocking, net surveys and angler surveys for Hoover, Alum Creek, Buckeye Lake and 46 more Ohio lakes, with sources.">', head)
head = head.replace('<link rel="canonical" href="https://nightbiteoh.com/ice">', '<link rel="canonical" href="https://nightbiteoh.com/stocking">')
assert "stocking" in head
# ice.html's own scripts at the bottom stay (refresh, sw-update, alerts, nav, lake-picker); nothing else is needed

D = "https://ohiodnr.gov/static/documents/wildlife/fishing-forecasts-reports/d1/lakes/"
def pdf(name): return D + name.replace(" ", "%20") + ".pdf"
EXT = ' target="_blank" rel="noopener"'
ODNR_MAP = {
    "hoover": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638/page/Page#data_s=id%3AdataSource_2-1942de5a64a-layer-2-20%3A54%2Cid%3AdataSource_2-19d2fe52235-layer-8-20%3A58&zoom_to_selection=true",
    "alum": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638/page/Page#data_s=id%3AdataSource_2-1942de5a64a-layer-2-20%3A54%2Cid%3AdataSource_2-19d2fe52235-layer-8-20%3A2&zoom_to_selection=true",
    "buckeye": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638/page/Page#data_s=id%3AdataSource_2-1942de5a64a-layer-2-20%3A54%2Cid%3AdataSource_2-19d2fe52235-layer-8-20%3A13&zoom_to_selection=true",
    # ODNR's O'Shaughnessy page has no map link and its Griggs link is malformed, so both open the map itself
    "oshaughnessy": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "griggs": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "indian": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638/page/Page#data_s=id%3AdataSource_2-1942de5a64a-layer-2-20%3A54%2Cid%3AdataSource_2-19d2fe52235-layer-8-20%3A59&zoom_to_selection=true",
    "delaware": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638/page/Page#data_s=id%3AdataSource_2-1942de5a64a-layer-2-20%3A54%2Cid%3AdataSource_2-19d2fe52235-layer-8-20%3A24&zoom_to_selection=true",
    # the four newer lakes open the map itself; no per lake selection link was confirmed
    "deercreek": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "madison": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "knox": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "clearfork": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "seneca": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "dillon": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "logan": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "saltfork": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "burroak": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "dow": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "mosquito": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "berlin": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "westbranch": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "pymatuning": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "milton": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "leesville": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "grandlakestmarys": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "caesarcreek": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "eastfork": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "cjbrown": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "rockyfork": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "ladue": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "paintcreek": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "portagelakes": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "mogadore": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "loramie": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "nimisila": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "cowan": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "acton": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "tappan": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "piedmont": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "clendening": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "atwood": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "charlesmill": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "pleasanthill": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "beachcity": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "wingfoot": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "eastbranch": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "guilford": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "highlandtown": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "punderson": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
    "wellington": "https://experience.arcgis.com/experience/2a39044c75b04e68872564b4c6ec0638",
}
AREA = {
    "hoover": ("ODNR, Hoover Reservoir Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/hoover-reservoir-fishing-area"),
    "alum": ("ODNR, Alum Creek Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/alum-creek-lake-fishing-area"),
    "buckeye": ("ODNR, Buckeye Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/buckeye-lake-fishing-area"),
    "oshaughnessy": ("ODNR, O&rsquo;Shaughnessy Reservoir Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/o-shaughnessy-reservoir-fishing-area"),
    "griggs": ("ODNR, Griggs Reservoir Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/griggs-reservoir-fishing-area"),
    "indian": ("ODNR, Indian Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/indian-lake-fishing-area"),
    "delaware": ("ODNR, Delaware Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/delaware-lake-fishing-area"),
    "deercreek": ("ODNR, Deer Creek Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/deer-creek-lake-fishing-area"),
    "madison": ("ODNR, Madison Lake State Park", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/madison-lake-state-park"),
    "knox": ("ODNR, Knox Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/knox-lake-fishing-area"),
    "clearfork": ("ODNR, Clear Fork Reservoir Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/clear-fork-reservoir-fishing-area"),
    "seneca": ("ODNR, Seneca Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/seneca-lake-fishing-area"),
    "dillon": ("ODNR, Dillon Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/dillon-lake-fishing-area"),
    "logan": ("ODNR, Lake Logan Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/lake-logan-fishing-area"),
    "saltfork": ("ODNR, Salt Fork Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/salt-fork-lake-fishing-area"),
    "burroak": ("ODNR, Burr Oak Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/burr-oak-lake-fishing-area"),
    "dow": ("ODNR, Dow Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/dow-lake-fishing-area"),
    "mosquito": ("ODNR, Mosquito Creek Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/mosquito-creek-lake-fishing-area"),
    "berlin": ("ODNR, Berlin Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/berlin-lake-fishing-area"),
    "westbranch": ("ODNR, Kirwan Reservoir (West Branch) Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/kirwan-reservoir-west-branch-fishing-area"),
    "pymatuning": ("ODNR, Pymatuning Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/pymatuning-lake-fishing-area"),
    "milton": ("ODNR, Lake Milton Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/lake-milton-fishing-area"),
    "leesville": ("ODNR, Leesville Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/leesville-lake-fishing-area"),
    "grandlakestmarys": ("ODNR, Grand Lake St. Marys Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/grand-lake-st-marys-fishing-area"),
    "caesarcreek": ("ODNR, Caesar Creek Reservoir Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/caesar-creek-reservoir-fishing-area"),
    "eastfork": ("ODNR, East Fork Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/east-fork-lake-fishing-area"),
    "cjbrown": ("ODNR, C.J. Brown Reservoir Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/c-j-brown-reservoir-fishing-area"),
    "rockyfork": ("ODNR, Rocky Fork Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/rocky-fork-lake-fishing-area"),
    "ladue": ("ODNR, LaDue Reservoir Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/ladue-reservoir-fishing-area"),
    "paintcreek": ("ODNR, Paint Creek Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/paint-creek-lake-fishing-area"),
    "portagelakes": ("ODNR, Portage Lakes Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/portage-lakes-fishing-area"),
    "mogadore": ("ODNR, Mogadore Reservoir Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/mogadore-reservoir-fishing-area"),
    "loramie": ("ODNR, Lake Loramie Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/lake-loramie-fishing-area"),
    "nimisila": ("ODNR, Nimisila Reservoir Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/nimisila-reservoir-fishing-area"),
    "cowan": ("ODNR, Cowan Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/cowan-lake-fishing-area"),
    "acton": ("ODNR, Acton Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/acton-lake-fishing-area"),
    "tappan": ("ODNR, Tappan Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/tappan-lake-fishing-area"),
    "piedmont": ("ODNR, Piedmont Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/piedmont-lake-fishing-area"),
    "clendening": ("ODNR, Clendening Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/clendening-lake-fishing-area"),
    "atwood": ("ODNR, Atwood Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/atwood-lake-fishing-area"),
    "charlesmill": ("ODNR, Charles Mill Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/charles-mill-lake-fishing-area"),
    "pleasanthill": ("ODNR, Pleasant Hill Reservoir Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/pleasant-hill-reservoir-fishing-area"),
    "beachcity": ("ODNR, Beach City Wildlife Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/beach-city-wildlife-area"),
    "wingfoot": ("ODNR, Wingfoot Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/wingfoot-lake-fishing-area"),
    "eastbranch": ("Geauga Park District, Headwaters Park", "https://geaugaparkdistrict.org/park/headwaters-park/"),
    "guilford": ("ODNR, Guilford Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/guilford-lake-fishing-area"),
    "highlandtown": ("ODNR, Highlandtown Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/highlandtown-lake-fishing-area"),
    "punderson": ("ODNR, Punderson Lake Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/punderson-lake-fishing-area"),
    "wellington": ("ODNR, Wellington Upground Reservoir Fishing Area", "https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/wellington-upground-reservoir-fishing-area"),
}
PDFMAP = {
    "hoover": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/hooverreservoir2.pdf",
    "alum": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/alumcreeklake2.pdf",
    "buckeye": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/buckeyelake2.pdf",
    "oshaughnessy": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/oshaughnessyreservoir2.pdf",
    "griggs": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/griggsreservoir2.pdf",
    "indian": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/indianlake2.pdf",
    "delaware": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/delawarelake2.pdf",
    "deercreek": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/deercreeklake2.pdf",
    "madison": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/madisonlake2.pdf",
    "knox": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/knoxlake2.pdf",
    "clearfork": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/clearforkreservoir2.pdf",
    "seneca": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/senecalake2.pdf",
    "dillon": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/dillonlake2.pdf",
    "logan": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/lakelogan2.pdf",
    "saltfork": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/saltforklake2.pdf",
    "burroak": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/burroaklake2.pdf",
    "dow": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/dowlake2.pdf",
    "mosquito": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/mosquitocreeklake2.pdf",
    "berlin": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/berlinlake2.pdf",
    "westbranch": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/mjkirwanreservoir.pdf",
    "pymatuning": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/pymatuninglake2.pdf",
    "milton": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/lakemilton2.pdf",
    "leesville": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/leesvillelake2.pdf",
    "grandlakestmarys": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/grandlakestmarys2.pdf",
    "caesarcreek": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/caesarcreeklake2.pdf",
    "eastfork": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/eastforklake2.pdf",
    "cjbrown": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/cjbrownreservoir2.pdf",
    "rockyfork": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/rockyforklake2.pdf",
    "ladue": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/laduereservoir2.pdf",
    "paintcreek": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/paintcreeklake2.pdf",
    "portagelakes": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/portagelakes2.pdf",
    "mogadore": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/mogadorereservoir2.pdf",
    "loramie": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/lakeloramie2.pdf",
    "nimisila": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/nimisilalake2.pdf",
    "cowan": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/cowanlake2.pdf",
    "acton": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/actonlake2.pdf",
    "tappan": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/tappanlake2.pdf",
    "piedmont": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/piedmontlake2.pdf",
    "clendening": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/clendeninglake2.pdf",
    "atwood": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/atwoodlake2.pdf",
    "charlesmill": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/charlesmilllake2.pdf",
    "pleasanthill": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/pleasanthillreservoir2.pdf",
    "beachcity": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/wildlife-area-maps/beachcity.pdf",
    "wingfoot": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/wingfootlake2.pdf",
    "eastbranch": "https://geaugaparkdistrict.org/park/headwaters-park/",
    "guilford": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/guilfordlake2.pdf",
    "highlandtown": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/highlandtownlake2.pdf",
    "punderson": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/pundersonlake2.pdf",
    "wellington": "https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/maps/wellingtonupgroundreservoir.pdf",
}
STOCK_DB = "https://ohiodnr.gov/buy-and-apply/hunting-fishing-boating/fishing-resources/fish-stocking-records"

# stocking tables, exactly as ODNR's "last ten years" tables list them (a blank cell is no stocking listed)
STOCK = {
    "hoover": [
        ("Saugeye", "Hoover Saugeye Stocking up20", ("Fingerlings", "Fry"), [
            (2010, "284,036", ""), (2011, "284,269", ""), (2012, "290,913", ""), (2013, "", "2,891,503"), (2014, "294,728", ""),
            (2015, "", "2,895,880"), (2016, "289,170", ""), (2017, "679,460", ""), (2018, "418,243", ""), (2019, "296,175", "")]),
        ("Blue catfish", "Hoover Blue Catfish Stocking up20", ("Advanced fingerlings", "Yearlings"), [
            (2011, "8,316", "13,516"), (2012, "", "17,594"), (2013, "", "10,494"), (2015, "62,639", ""), (2016, "57,550", ""),
            (2017, "59,251", ""), (2018, "49,214", "")]),
        ("Walleye", "Hoover Walleye Stocking up20", ("Fingerlings", "Fry"), [(2019, "288,728", "")]),
    ],
    "alum": [
        ("Saugeye", "Alum Creek Saugeye Stocking up20", ("Fingerlings", "Fry"), [
            (2010, "", "3,192,560"), (2011, "321,935", ""), (2012, "334,435", ""), (2013, "338,683", ""), (2014, "", "3,350,000"),
            (2015, "333,935", ""), (2016, "", "3,366,263"), (2017, "202,440", "3,331,009"), (2018, "", "4,372,680"), (2019, "", "5,529,000")]),
        ("Muskellunge", "Alum Creek Muskellunge Stocking up20", ("Advanced fingerlings", "Fingerlings", "Fry"), [
            (2010, "2,234", "", ""), (2011, "1,955", "66,122", "598,631"), (2012, "3,332", "", "159,518"), (2013, "3,322", "", ""),
            (2014, "3,373", "", ""), (2015, "3,451", "", ""), (2016, "3,325", "", ""), (2017, "3,577", "", ""), (2018, "3,598", "", ""),
            (2019, "2,541", "", "")]),
    ],
    "indian": [
        ("Saugeye", "Indian Saugeye Stocking up20", ("Fingerlings", "Fry"), [
            (2010, "231,529", ""), (2011, "524,876", "2,797,350"), (2012, "505,137", ""), (2013, "510,240", ""), (2014, "", "5,081,351"),
            (2015, "540,426", ""), (2016, "", "5,123,783"), (2017, "", "5,125,133"), (2018, "", "6,907,875"), (2019, "", "7,139,320")]),
    ],
    "delaware": [],   # ODNR posts no stocking table among Delaware Lake's lake PDFs
}

# length at age (inches), lake row and ODNR's statewide average row, ages as the PDF lists them
GROWTH = {
    "hoover": [
        ("Saugeye", "Hoover Saugeye Survey up20", "gill nets", 0, [10.4, 15.2, 18.0, 20.2, 22.6, 23.7, 26.6, 27.0], [9.8, 13.9, 17.4, 19.6, 20.9, 22.3, 22.9, 23.2, 24.8], "2007 to 2019"),
        ("Crappie", "Hoover Crappie Survey up20", "trap nets", 0, [3.7, 7.5, 9.2, 9.9, 10.6, 10.4, 10.9], [3.8, 6.9, 8.6, 9.5, 10.1, 10.3, 10.5, 10.6, 10.4], "2009 to 2019"),
        ("Largemouth bass", "Hoover Largemouth Bass Survey up20", "electrofishing", 1, [7.0, 10.0, 12.4, 14.3, 15.4, 16.3, 17.5, 18.0, 17.2, 19.8], [5.8, 8.8, 11.3, 12.9, 14.2, 15.2, 15.8, 16.6, 17.2, 18.3], "2007 to 2019"),
    ],
    "alum": [
        ("Saugeye", "Alum Creek Saugeye Survey up20", "gill nets", 0, [10.4, 15.2, 16.9, 19.2, 21.7, 22.1], [9.8, 13.9, 17.4, 19.6, 20.9, 22.3, 22.9, 23.2, 24.8], "2010 to 2019"),
        ("Crappie", "Alum Creek Crappie Survey up20", "trap nets", 0, [3.5, 7.8, 9.6, 10.8, 10.9, 11.7], [3.8, 6.9, 8.6, 9.5, 10.1, 10.3, 10.5, 10.6, 10.4], "2010 to 2019"),
        ("Largemouth bass", "Alum Creek Largemouth Bass Survey up20", "electrofishing", 1, [6.1, 10.3, 13.3, 15.1, 17.4, 16.6, 17.6, 19.3, 19.7, 19.3], [5.8, 8.8, 11.3, 12.9, 14.2, 15.2, 15.8, 16.6, 17.2, 18.3], "2010 to 2019"),
    ],
    # None: the PDF leaves that age blank
    "indian": [
        ("Saugeye", "Indian Saugeye Survey up20", "gill nets", 0, [9.7, 14.4, 17.3, 19.9, 22.3, 22.4, None, 20.9], [9.8, 13.9, 17.4, 19.6, 20.9, 22.3, 22.9, 23.2, 24.8], "2003 to 2019"),
        ("Crappie", "Indian Crappie Survey up20", "trap nets", 0, [3.6, 7.6, 9.8, 10.9, 11.7, 11.2, 11.2, 12.7, 12.4], [3.8, 6.9, 8.6, 9.5, 10.1, 10.3, 10.5, 10.6, 10.4], "2008 to 2017"),
        ("Largemouth bass", "Indian Largemouth Bass Survey up20", "electrofishing", 1, [5.8, 9.8, 11.4, 13.0, 14.4, 15.0, 14.4, 13.8, 16.7], [5.8, 8.8, 11.3, 12.9, 14.2, 15.2, 15.8, 16.6, 17.2, 18.3], "2005 to 2017"),
    ],
    "delaware": [
        ("Crappie", "Delaware Crappie Survey up20", "trap nets", 0, [3.7, 7.6, 9.5, 10.4, 11.0, 10.9, 12.1], [3.8, 6.9, 8.6, 9.5, 10.1, 10.3, 10.5, 10.6, 10.4], "2009 to 2019"),
        ("Largemouth bass", "Delaware Largemouth Bass Survey up20", "electrofishing", 1, [5.7, 8.8, 11.4, 13.6, 13.6, 15.8, 14.7, 17.5, 16.9, 18.1], [5.8, 8.8, 11.3, 12.9, 14.2, 15.2, 15.8, 16.6, 17.2, 18.3], "2010 to 2019"),
    ],
}
CATFISH = {"hoover": ("Hoover Channel Catfish Survey up20", "2016"), "alum": ("Alum Creek Channel Catfish Survey up20", "2018"),
           "indian": ("Indian Channel Catfish Survey up20", "2018"), "delaware": ("Delaware Channel Catfish Survey up20", "2017")}
ANGLER = {
    "hoover": ("Hoover Angler Survey up20", "2016", "1,412", [
        ("Crappie", "29.4", "1.79"), ("Anything", "27.4", ""), ("Black bass", "19.2", "0.51"), ("Saugeye", "14.0", "0.15"),
        ("Catfish", "6.2", "0.28"), ("Sunfish", "3.3", "2.11"), ("White bass", "0.2", "0")]),
    "alum": ("D1 Lakes Alum Creek Angler Survey up20", "2018", "1,276", [
        ("Anything", "35.4", ""), ("Black bass", "32.8", "0.98"), ("Saugeye", "11.2", "0.58"), ("Crappie", "10.4", "1.11"),
        ("Catfish", "6", "0.37"), ("Muskie", "3.8", "0"), ("White bass", "0.4", "3.5"), ("Sunfish", "0", "")]),
    "indian": ("Indian Angler Survey up20", "2014", "1,289", [
        ("Black bass", "29.4", "0.44"), ("Anything", "22.6", ""), ("Catfish", "21.8", "0.36"), ("Crappie", "16.1", "1.09"),
        ("Saugeye", "6", "0.2"), ("Sunfish", "4.1", "1.68"), ("White bass", "0", "0")]),
    "delaware": ("Delaware Angler Survey up20", "2016", "397", [
        ("Black bass", "33.3", "0.66"), ("Anything", "29.0", ""), ("Crappie", "28.6", "1.50"), ("Catfish", "7.8", "0.60"),
        ("Sunfish", "1.0", "1.55")]),
}
FORECAST = {
    "hoover": [
        "Blue catfish were first stocked in 2011, and some of the older fish already weigh over thirty pounds.",
        "Saugeye have rebounded: average to above average stocking success since 2017, with many sizes from 10 to 20 inches.",
        "Walleye were stocked in 2019 for the first time in over thirty years, part of a three year walleye and saugeye study.",
        "Crappie trap nets show an even split of fish above and below the nine inch minimum length.",
        "Most bass sampled are 12 to 18 inches. White bass run up Big Walnut Creek in spring.",
    ],
    "alum": [
        "A strong 2016 year class of largemouth bass should give good numbers of 13 to 16 inch fish.",
        "Some of the best smallmouth fishing in the state, many 10 to 14 inches and some reaching 5 to 6 pounds.",
        "Saugeye stocked in 2017 survived very well, giving many fish of 17 to 20 inches.",
        "Recent crappie trap nets had the best catch rate of crappie over 11 inches in ten years.",
        "Muskie are stocked every year: usually best May to July in the lake and March to April in the spillway.",
    ],
    "indian": [
        "One of Ohio&rsquo;s best saugeye lakes by angler reports and gill nets: stocked fish survive well and grow fast in this shallow, productive lake.",
        "Crappie have done very well, with many black and white crappie over nine inches and a real chance at 14 to 16 inch fish.",
        "Largemouth bass do well in the shallow water and weeds; good numbers, though most are under 15 inches.",
        "One of the best bluegill lakes in central Ohio, where fish over eight inches are caught consistently.",
        "Flathead catfish have grown in number over the past decade, with fish of 20 to 30 pounds caught every year. White bass run up the South Fork of the Great Miami River near Moundwood in spring.",
    ],
    "delaware": [
        "Best known for crappie: both black and white crappie reproduce well, and trap nets show many fish over nine inches.",
        "Crappie catch rates are above average, and crappie tournament fish average about one pound.",
        "Largemouth bass numbers have trended down over five years, but there are still good numbers, mostly 12 to 15 inches.",
        "Channel catfish hoop nets caught three times the statewide average rate, the highest in central Ohio, though about three quarters were under 15 inches.",
        "Bluegill and white bass can be caught in good numbers at different times of the year.",
    ],
}
NAME = {"hoover": "Hoover", "alum": "Alum Creek", "indian": "Indian Lake", "delaware": "Delaware Lake"}
DATA = ("hoover", "alum", "indian", "delaware")   # lakes with ODNR lake PDFs
NONE = ("buckeye", "oshaughnessy", "griggs")      # lakes ODNR publishes no lake PDFs for
NOTE = "Copied from the PDF; a dash means none listed."

# Lakes with no ODNR lake PDFs whose stocking is read from ODNR's public Fish Stocking dashboard (Tableau), last ten years.
# Read Oct. 30, 2026 (dashboard "data updated 10/27/2026"). Deer Creek and Clear Fork list one species only.
DB = ("deercreek", "madison", "knox", "clearfork", "seneca", "dillon", "logan", "saltfork", "burroak", "dow", "mosquito", "berlin", "westbranch", "pymatuning", "milton", "leesville", "grandlakestmarys", "caesarcreek", "eastfork", "cjbrown", "rockyfork", "ladue", "paintcreek", "portagelakes", "mogadore", "loramie", "nimisila", "cowan", "acton", "tappan", "piedmont", "clendening", "atwood", "charlesmill", "pleasanthill", "beachcity", "wingfoot", "eastbranch", "guilford", "highlandtown", "punderson", "wellington")
DB_NAME = {"deercreek": "Deer Creek Lake", "madison": "Madison Lake", "knox": "Knox Lake", "clearfork": "Clear Fork Reservoir",
           "seneca": "Seneca Lake", "dillon": "Dillon Lake", "logan": "Lake Logan", "saltfork": "Salt Fork Lake", "burroak": "Burr Oak Lake", "dow": "Dow Lake",
           "mosquito": "Mosquito Creek Lake", "berlin": "Berlin Lake", "westbranch": "West Branch Reservoir", "pymatuning": "Pymatuning Lake", "milton": "Lake Milton", "leesville": "Leesville Lake", "grandlakestmarys": "Grand Lake St. Marys", "caesarcreek": "Caesar Creek Lake", "eastfork": "East Fork Lake", "cjbrown": "C.J. Brown Reservoir", "rockyfork": "Rocky Fork Lake", "ladue": "LaDue Reservoir", "paintcreek": "Paint Creek Lake", "portagelakes": "Portage Lakes", "mogadore": "Mogadore Reservoir", "loramie": "Lake Loramie", "nimisila": "Nimisila Reservoir", "cowan": "Cowan Lake", "acton": "Acton Lake", "tappan": "Tappan Lake", "piedmont": "Piedmont Lake", "clendening": "Clendening Lake", "atwood": "Atwood Lake", "charlesmill": "Charles Mill Lake", "pleasanthill": "Pleasant Hill Lake", "beachcity": "Beach City Lake", "wingfoot": "Wingfoot Lake", "eastbranch": "East Branch Reservoir", "guilford": "Guilford Lake", "highlandtown": "Highlandtown Lake", "punderson": "Punderson Lake", "wellington": "Wellington Upground Reservoir"}
DASH = "https://analytics.das.ohio.gov/t/DOPPUB/views/ODNR_Fish_Stocking/FishStocking"
DB_STOCK = {
    "deercreek": [("Saugeye", ("Fingerlings",), [
        (2016, "123,902"), (2017, "196,072"), (2018, "78,798"), (2019, "262,206"), (2020, "195,763"),
        (2021, "130,284"), (2022, "130,675"), (2023, "130,226"), (2024, "130,147"), (2025, "131,463")])],
    "madison": [("Channel catfish", ("Fingerlings", "Advanced fingerlings"), [
        (2016, "5,390", ""), (2018, "2,528", ""), (2020, "2,467", ""), (2022, "", "4,960"), (2024, "", "4,920")])],
    "knox": [("Yellow perch", ("Fingerlings",), [(2019, "181,050"), (2022, "238,067"), (2023, "119,205"), (2024, "119,151"), (2025, "119,343")]),
             ("Channel catfish", ("Yearlings",), [(2017, "3,060")])],
    "clearfork": [("Muskellunge", ("Advanced fingerlings",), [
        (2016, "1,087"), (2017, "1,022"), (2018, "1,084"), (2019, "1,011"), (2020, "1,204"),
        (2021, "660"), (2022, "1,015"), (2023, "1,019"), (2024, "1,482"), (2025, "664")])],
    "seneca": [("Saugeye", ("Fingerlings", "Fry",), [
        (2016, "", "3,668,980"), (2017, "", "6,251,770"), (2018, "", "5,474,280"), (2019, "108,000", "6,063,230"), (2020, "", "4,135,080"), (2021, "", "3,587,715"), (2022, "", "4,052,000"), (2023, "", "2,737,600"), (2024, "", "3,587,112"), (2025, "348,908", "1,836,000")]),
        ("Blue catfish", ("Advanced fingerlings", "Fry", "Yearlings", "Catchables",), [
        (2016, "58,577", "", "5,294", ""), (2017, "58,812", "", "", ""), (2018, "61,348", "", "", ""), (2019, "95,066", "56,115", "", ""), (2020, "92,072", "", "", ""), (2022, "35,897", "", "", "429"), (2024, "37,140", "", "", "")])],
    "dillon": [("Hybrid striped bass", ("Fingerlings",), [
        (2016, "140,222"), (2017, "64,441"), (2018, "66,592"), (2019, "36,268"), (2020, "35,319"), (2021, "5,147"), (2022, "40,052"), (2023, "127,847"), (2024, "76,393"), (2025, "21,131")]),
        ("Saugeye", ("Fingerlings", "Fry",), [
        (2016, "131,425", "826,900"), (2017, "244,812", ""), (2018, "76,899", ""), (2019, "268,396", ""), (2020, "85,671", ""), (2021, "128,289", ""), (2022, "128,858", ""), (2023, "174,654", ""), (2024, "128,120", ""), (2025, "127,900", "")]),
        ("Blue catfish", ("Advanced fingerlings", "Fry",), [
        (2022, "31,693", "21,366"), (2023, "4,898", "88,012"), (2024, "", "12,177"), (2025, "6,291", "17,167")])],
    "logan": [("Saugeye", ("Fingerlings",), [
        (2016, "43,800"), (2017, "67,120"), (2018, "21,100"), (2019, "66,813"), (2020, "67,493"), (2021, "66,924"), (2022, "66,528"), (2023, "66,314"), (2024, "66,544"), (2025, "33,750")]),
        ("Channel catfish", ("Fingerlings", "Yearlings",), [
        (2016, "6,714", "3,401"), (2018, "", "2,525"), (2020, "8,382", "2,905"), (2022, "", "5,000"), (2024, "", "5,060")])],
    "saltfork": [("Muskellunge", ("Advanced fingerlings",), [
        (2016, "3,194"), (2017, "3,305"), (2018, "3,140"), (2019, "2,457"), (2020, "3,660"), (2021, "2,208"), (2022, "3,063"), (2023, "3,161"), (2024, "3,630"), (2025, "1,927")]),
        ("Saugeye", ("Fingerlings",), [
        (2016, "310,902"), (2017, "459,301"), (2018, "205,921"), (2019, "573,106"), (2020, "306,542"), (2021, "764,694"), (2022, "468,698"), (2023, "456,397"), (2024, "730,985"), (2025, "458,583")])],
    "burroak": [("Channel catfish", ("Fingerlings", "Yearlings",), [
        (2016, "", "5,191"), (2018, "", "3,095"), (2020, "9,221", "2,531"), (2022, "", "4,872"), (2024, "", "5,310")]),
        ("Blue catfish", ("Advanced fingerlings",), [
        (2022, "6,889"), (2023, "6,891"), (2024, "5,510"), (2025, "6,886")])],
    "dow": [("Saugeye", ("Fingerlings",), [
        (2016, "38,055"), (2017, "34,831"), (2018, "11,629"), (2019, "39,536"), (2020, "34,525"), (2021, "44,372"), (2022, "35,483"), (2023, "34,763"), (2024, "35,098"), (2025, "17,963")]),
        ("Rainbow trout", ("Catchables",), [
        (2016, "3,014"), (2017, "3,010"), (2018, "3,001"), (2019, "3,001"), (2020, "2,586"), (2021, "2,504"), (2022, "2,510")]),
        ("Channel catfish", ("Fingerlings", "Yearlings",), [
        (2017, "5,836", "2,915"), (2019, "", "4,299")])],
    "mosquito": [('Walleye', ('Fingerlings', 'Fry'), [(2016, '', '9,373,000'), (2017, '753,854', '14,115,481'), (2018, '368,886', '7,234,070'), (2019, '417,945', '10,111,820'), (2020, '457,609', '9,304,430'), (2021, '713,424', '7,421,710'), (2022, '2,030,140', '9,325,513'), (2023, '397,714', '9,362,733'), (2024, '1,440,834', '9,941,065'), (2025, '883,376', '6,737,985')]), ('Bluegill', ('Catchables',), [(2025, '125')])],
    "berlin": [('Walleye', ('Fingerlings', 'Fry'), [(2016, '', '3,449,935'), (2017, '395,081', '4,492,786'), (2018, '', '6,710,980'), (2019, '316,282', '3,300,000'), (2020, '313,951', '5,484,600'), (2021, '330,016', '3,155,424'), (2022, '775,590', '3,132,000'), (2023, '328,853', '3,152,152'), (2024, '610,170', '3,134,610'), (2025, '404,931', '1,715,090')])],
    "westbranch": [('Muskellunge', ('Advanced fingerlings',), [(2016, '2,629'), (2017, '2,629'), (2018, '3,418'), (2019, '1,876'), (2020, '2,730'), (2021, '1,362'), (2022, '2,643'), (2023, '2,607'), (2024, '2,624'), (2025, '1,699')]), ('Walleye', ('Fingerlings',), [(2016, '142,089'), (2017, '496,186'), (2018, '264,166'), (2019, '270,243'), (2020, '340,676'), (2021, '136,017'), (2022, '526,433'), (2024, '519,672'), (2025, '264,996')]), ('Blue catfish', ('Advanced fingerlings',), [(2023, '26,235'), (2024, '20,456'), (2025, '27,612')])],
    "pymatuning": [('Walleye', ('Fingerlings',), [(2016, '298,251'), (2017, '644,339'), (2018, '377,790'), (2019, '415,021'), (2020, '294,420'), (2021, '294,984'), (2022, '299,812'), (2024, '293,785'), (2025, '293,132')])],
    "milton": [('Walleye', ('Fingerlings', 'Fry'), [(2016, '93,806', ''), (2017, '280,714', ''), (2018, '170,951', ''), (2019, '170,189', '1,765,620'), (2020, '170,549', ''), (2021, '270,621', ''), (2022, '340,517', ''), (2023, '97,875', ''), (2024, '204,697', ''), (2025, '254,873', '')]), ('Muskellunge', ('Advanced fingerlings',), [(2016, '1,695'), (2017, '1,691'), (2018, '2,415'), (2019, '1,049'), (2020, '1,828'), (2021, '1,037'), (2022, '1,774'), (2023, '1,696'), (2024, '1,726'), (2025, '1,096')])],
    "leesville": [('Saugeye', ('Fingerlings', 'Fry'), [(2016, '60,336', '1,268,000'), (2017, '180,503', ''), (2018, '62,936', ''), (2019, '203,451', ''), (2020, '101,323', ''), (2021, '136,497', ''), (2022, '202,451', ''), (2023, '105,717', ''), (2024, '225,959', ''), (2025, '101,544', '')]), ('Muskellunge', ('Advanced fingerlings',), [(2016, '1,192'), (2017, '1,041'), (2018, '1,127'), (2019, '1,065'), (2020, '1,049'), (2021, '761'), (2022, '1,451'), (2023, '1,148'), (2024, '1,560'), (2025, '985')]), ('Channel catfish', ('Advanced fingerlings', 'Yearlings'), [(2017, '', '4,737'), (2019, '', '4,727'), (2021, '', '5,022'), (2023, '5,000', ''), (2025, '10,125', '')])],
    "grandlakestmarys": [('Yellow perch', ('Advanced fingerlings', 'Fingerlings', 'Fry'), [(2016, '', '183,762', '12,525,000'), (2017, '', '103,253', '10,698,750'), (2019, '', '260,835', '2,655,000'), (2020, '', '556,861', '1,897,500'), (2022, '3,396', '', ''), (2023, '', '322,685', ''), (2024, '', '202,547', ''), (2025, '', '397,834', '')]), ('Triploid saugeye', ('Advanced fingerlings', 'Fingerlings', 'Fry'), [(2025, '460', '214,403', '449,595')]), ('Channel catfish', ('Fingerlings',), [(2017, '15,898')])],
    "caesarcreek": [('Saugeye', ('Fingerlings', 'Fry'), [(2016, '282,366', ''), (2017, '166,203', '2,905,956'), (2018, '', '2,850,000'), (2019, '87,704', '4,025,886'), (2020, '', '3,713,175'), (2021, '147,929', '1,402,825'), (2022, '', '4,211,295'), (2023, '', '2,125,755'), (2024, '', '2,806,287'), (2025, '', '2,984,565')]), ('Muskellunge', ('Advanced fingerlings', 'Fingerlings', 'Fry'), [(2016, '2,829', '11,171', '35,144'), (2017, '2,796', '39,106', '375,749'), (2018, '3,981', '3,998', '228,303'), (2019, '1,758', '8,994', '410,399'), (2020, '3,006', '', ''), (2021, '1,653', '', '59,567'), (2022, '2,803', '', '63,505'), (2023, '2,813', '', '459,780'), (2024, '2,823', '2,998', '38,926'), (2025, '1,828', '8,056', '270,828')]), ('Blue catfish', ('Advanced fingerlings', 'Fry'), [(2018, '54,716', ''), (2019, '73,532', '70,844'), (2020, '59,637', '93,164'), (2021, '62,220', '38,268'), (2022, '56,124', ''), (2024, '14,739', '')]), ('Rainbow trout', ('Catchables',), [(2025, '576')])],
    "eastfork": [('Hybrid striped bass', ('Fry',), [(2016, '1,000,000'), (2017, '1,050,000'), (2018, '1,150,000'), (2019, '1,050,000'), (2020, '1,050,000'), (2021, '1,150,000'), (2022, '1,050,000'), (2023, '1,100,000'), (2024, '1,100,000'), (2025, '1,150,000')]), ('Saugeye', ('Fingerlings', 'Fry'), [(2018, '125,989', ''), (2019, '475,490', '1,062,155'), (2020, '212,080', ''), (2021, '', '2,150,000'), (2022, '210,865', ''), (2023, '211,477', ''), (2024, '212,877', ''), (2025, '212,290', '')]), ('Blue catfish', ('Advanced fingerlings',), [(2022, '21,074'), (2023, '21,093'), (2024, '16,434'), (2025, '21,091')]), ('Muskellunge', ('Advanced fingerlings', 'Fry'), [(2016, '786', '211,332')])],
    "cjbrown": [('Walleye', ('Fingerlings', 'Fry'), [(2016, '120,017', ''), (2017, '640,263', '1,735,078'), (2018, '276,715', ''), (2019, '431,378', '2,885,952'), (2020, '455,427', ''), (2021, '393,881', ''), (2022, '469,227', ''), (2023, '397,631', ''), (2024, '392,819', ''), (2025, '294,704', '')]), ('Muskellunge', ('Advanced fingerlings', 'Fingerlings', 'Fry'), [(2018, '2,876', '', ''), (2019, '1,374', '', ''), (2020, '2,032', '', ''), (2021, '1,191', '', '282,405'), (2022, '1,964', '', '258,411'), (2023, '967', '', '73,065'), (2024, '1,974', '', ''), (2025, '1,152', '1,657', '76,423')])],
    "rockyfork": [('Saugeye', ('Fingerlings', 'Fry'), [(2016, '194,561', ''), (2017, '464,884', ''), (2018, '119,479', ''), (2019, '501,372', '1,179,415'), (2020, '196,182', ''), (2021, '586,296', ''), (2022, '391,369', ''), (2023, '390,877', ''), (2024, '392,367', ''), (2025, '261,205', '')]), ('Rainbow trout', ('Catchables',), [(2016, '1,632'), (2017, '1,626'), (2018, '1,626'), (2019, '1,625')])],
    "ladue": [('Walleye', ('Fingerlings',), [(2016, '169,792'), (2017, '270,519'), (2018, '51,691'), (2019, '324,744'), (2020, '168,871'), (2021, '278,797'), (2022, '296,511'), (2024, '205,685'), (2025, '172,562')]), ('Channel catfish', ('Advanced fingerlings', 'Fingerlings', 'Yearlings'), [(2016, '', '', '5,223'), (2018, '', '', '2,501'), (2020, '', '11,703', '3,255'), (2022, '10,000', '', ''), (2024, '10,000', '', '')])],
    "paintcreek": [('Saugeye', ('Fingerlings', 'Fry'), [(2016, '165,429', ''), (2017, '182,998', ''), (2018, '82,738', ''), (2019, '282,182', '1,153,960'), (2020, '176,946', ''), (2021, '117,843', ''), (2022, '123,136', ''), (2023, '118,178', ''), (2024, '118,603', ''), (2025, '118,054', '')])],
    "portagelakes": [('Channel catfish', ('Advanced fingerlings', 'Yearlings'), [(2017, '', '5,051'), (2019, '', '5,027'), (2021, '', '5,002'), (2023, '5,000', ''), (2025, '5,700', '')])],
    "mogadore": [('Channel catfish', ('Advanced fingerlings', 'Fingerlings', 'Yearlings'), [(2017, '', '', '5,017'), (2019, '', '', '5,088'), (2021, '', '5,022', ''), (2023, '5,000', '', ''), (2025, '10,009', '', '')])],
    "loramie": [('Saugeye', ('Fingerlings', 'Fry'), [(2016, '86,374', '1,601,840'), (2017, '180,158', ''), (2018, '82,976', ''), (2019, '175,550', ''), (2020, '87,079', ''), (2021, '173,822', ''), (2022, '174,374', ''), (2023, '88,128', ''), (2024, '174,116', ''), (2025, '87,656', '')]), ('Channel catfish', ('Catchables',), [(2016, '500'), (2017, '505'), (2018, '500'), (2019, '505'), (2021, '505'), (2022, '510'), (2023, '597')])],
    "nimisila": [('Channel catfish', ('Yearlings',), [(2016, '5,031'), (2018, '2,506'), (2020, '5,116'), (2022, '5,000'), (2024, '5,039')]), ('Walleye', ('Fingerlings',), [(2016, '41,385'), (2017, '129,327'), (2018, '74,452')])],
    "cowan": [('Saugeye', ('Fingerlings', 'Fry'), [(2016, '70,040', ''), (2017, '148,158', ''), (2018, '45,041', ''), (2019, '141,972', '950,320'), (2020, '71,910', ''), (2021, '173,704', ''), (2022, '138,830', ''), (2023, '69,585', ''), (2024, '139,989', ''), (2025, '104,229', '')]), ('Channel catfish', ('Catchables',), [(2020, '306')])],
    "acton": [('Saugeye', ('Fingerlings',), [(2016, '54,606'), (2017, '121,337'), (2018, '45,421'), (2019, '172,434'), (2020, '60,394'), (2021, '158,865'), (2022, '118,719'), (2023, '59,256'), (2024, '118,513'), (2025, '89,006')])],
    "tappan": [('Saugeye', ('Fingerlings',), [(2016, '187,710'), (2017, '337,085'), (2018, '139,184'), (2019, '458,316'), (2020, '228,573'), (2021, '456,205'), (2022, '373,894'), (2023, '455,054'), (2024, '454,800'), (2025, '341,199')])],
    "piedmont": [('Muskellunge', ('Advanced fingerlings',), [(2016, '2,470'), (2017, '2,349'), (2018, '3,549'), (2019, '1,854'), (2020, '2,375'), (2021, '1,860'), (2022, '2,374'), (2023, '2,560'), (2024, '2,371'), (2025, '1,510')]), ('Saugeye', ('Fingerlings',), [(2016, '237,060'), (2017, '346,129'), (2018, '243,902'), (2019, '474,995'), (2020, '237,421'), (2021, '475,752'), (2022, '478,597'), (2023, '237,000'), (2024, '528,448'), (2025, '356,689')])],
    "clendening": [('Blue catfish', ('Advanced fingerlings', 'Fry'), [(2016, '33,071', ''), (2017, '34,547', ''), (2018, '31,400', ''), (2019, '42,243', '55,715'), (2021, '50,557', ''), (2023, '17,038', ''), (2025, '17,047', '')]), ('Saugeye', ('Fingerlings',), [(2016, '141,381'), (2017, '220,673'), (2018, '181,984'), (2019, '350,527'), (2020, '186,697'), (2021, '340,508'), (2022, '341,789'), (2023, '197,807'), (2024, '361,435'), (2025, '171,308')])],
    "atwood": [('Saugeye', ('Fingerlings',), [(2016, '156,566'), (2017, '274,426'), (2018, '96,783'), (2019, '277,021'), (2020, '156,724'), (2021, '340,532'), (2022, '344,849'), (2023, '312,807'), (2024, '369,261'), (2025, '234,488')]), ('Blue catfish', ('Advanced fingerlings',), [(2023, '15,648'), (2024, '12,522'), (2025, '15,800')]), ('Channel catfish', ('Yearlings',), [(2020, '7,566')])],
    "charlesmill": [('Saugeye', ('Fingerlings',), [(2016, '173,697'), (2017, '246,186'), (2018, '85,697'), (2019, '272,512'), (2020, '203,409'), (2021, '134,914'), (2022, '136,580'), (2023, '134,820'), (2024, '136,648'), (2025, '135,674')]), ('Hybrid striped bass', ('Fingerlings',), [(2016, '139,403'), (2017, '67,757'), (2018, '69,155'), (2019, '24,379'), (2020, '71,029'), (2022, '48,907'), (2023, '134,421'), (2024, '67,728'), (2025, '22,665')])],
    "pleasanthill": [('Saugeye', ('Fingerlings', 'Fry'), [(2016, '', '783,000'), (2017, '199,125', ''), (2018, '73,456', ''), (2019, '226,941', ''), (2020, '157,684', ''), (2021, '156,825', ''), (2022, '156,794', ''), (2023, '159,699', ''), (2024, '158,149', ''), (2025, '117,484', '')]), ('Channel catfish', ('Catchables',), [(2016, '1,523'), (2017, '1,533'), (2018, '1,000'), (2021, '505'), (2022, '750'), (2023, '1,000')])],
    "beachcity": [],
    "wingfoot": [('Channel catfish', ('Advanced fingerlings', 'Fingerlings', 'Yearlings'), [(2016, '', '7,856', '9,864'), (2022, '10,000', '', ''), (2024, '10,000', '', '')])],
    "eastbranch": [],
    "guilford": [('Hybrid striped bass', ('Fingerlings',), [(2016, '49,124'), (2018, '19,077'), (2019, '10,479'), (2020, '19,817'), (2022, '9,000'), (2023, '36,176')]), ('Channel catfish', ('Yearlings',), [(2016, '5,076'), (2018, '1,008'), (2020, '1,893')])],
    "highlandtown": [('Channel catfish', ('Fingerlings', 'Yearlings'), [(2016, '5,273', '3,196'), (2020, '', '1,008')])],
    "punderson": [('Bluegill', ('Catchables',), [(2025, '125')]), ('Channel catfish', ('Advanced fingerlings', 'Yearlings'), [(2017, '', '2,025'), (2019, '', '2,025'), (2021, '', '2,089'), (2023, '960', ''), (2025, '960', '')]), ('Rainbow trout', ('Catchables',), [(2016, '2,500'), (2017, '3,724'), (2018, '4,306'), (2019, '2,501'), (2020, '2,835'), (2021, '2,005'), (2022, '2,004')]), ('Brown trout', ('Yearlings',), [(2016, '1,306')])],
    "wellington": [('Yellow perch', ('Fingerlings',), [(2016, '87,057'), (2017, '40,596'), (2019, '64,155'), (2020, '39,760'), (2021, '79,982'), (2022, '79,707'), (2023, '40,103'), (2024, '39,750'), (2025, '39,918')]), ('Channel catfish', ('Fingerlings', 'Yearlings'), [(2016, '', '4,082'), (2018, '5,135', ''), (2020, '7,965', ''), (2022, '', '1,908'), (2024, '', '1,908')])],
}
DB_SAYS = {
    "deercreek": "What ODNR does say: the Corps of Engineers finished the dam in 1968. The lake impounds 1,290 acres from Deer Creek and Clark Run, and its level can change up to 20 ft because the watershed is large for the lake. ODNR says early spring saugeye below the dam is the fishery the park is famous for.",
    "madison": "What ODNR does say: a dam across Deer Creek filled the 106 acre lake by 1947. Anglers catch bass, bluegill, crappie, channel catfish and bullhead. Electric motors only.",
    "knox": "What ODNR does say: Knox Lake has the best average bass size among similar tributary reservoirs, with 51% of bass collected over 15 inches, and ranks 5th among Ohio reservoirs for bass over 15 inches. The 18 inch minimum dates to 1991. ODNR posts no survey table.",
    "clearfork": "What ODNR does say: the City of Mansfield finished the 971 acre water supply reservoir in 1949. It has a gently sloping bottom, a maximum depth of 24 ft, a shallow stumpy upper end, islands mid-lake and a deeper open lower end.",
    "seneca": "What ODNR does say: the Corps of Engineers built Seneca Lake dam in 1938 across Seneca Fork of Wills Creek. It is the largest MWCD lake, 3,509 acres with 45 miles of shoreline, with a 399 hp limit. MWCD controls boating, swimming and camping. ODNR also links a Seneca striped bass stocking report that the dashboard does not list in the last ten years. ODNR links crappie and largemouth surveys and an angler survey; they aren&rsquo;t copied here.",
    "dillon": "What ODNR does say: Dillon Lake was built for flood control, with 1,376 acres of water and a 748 square mile watershed. The Corps of Engineers and ODNR manage it jointly. Unlimited horsepower; many coves are no wake.",
    "logan": "What ODNR does say: Lake Logan was built in 1955 and was once called Hocking Lake. It is 333 acres at normal pool with 9.5 miles of shoreline, 18 ft at the deepest, and the headwaters are 3 ft or less. 10 hp limit.",
    "saltfork": "What ODNR does say: the earthen dam was finished in 1967. Trees and shrubs were left standing in many bays and an artificial reef was built on the north branch for fish cover; boulders line parts of the shore. ODNR links crappie, largemouth and smallmouth surveys; they aren&rsquo;t copied here.",
    "burroak": "What ODNR does say: largemouth bass from 3 to 23 inches, a consistent producer of fish over 18, and one of the top bass lakes in the area. White crappie lead, most 7 to 8 inches with fish over 15 every year; channel catfish 10 to 25 inches; flatheads occasionally. ODNR links channel catfish, crappie and largemouth surveys and an angler survey; they aren&rsquo;t copied here.",
    "dow": "What ODNR does say: the dam creating Dow Lake was finished in 1960. ODNR&rsquo;s fishing page lists 171 acres at normal pool, 6.4 miles of shoreline and 33 ft at the deepest. 10 hp limit. ODNR stocked rainbow trout here through 2022.",
    "mosquito": "What ODNR does say: the Corps of Engineers built Mosquito Creek Lake in 1944, damming Mosquito Creek 9 miles upstream from Niles. It is 7,241 acres, 24 ft at the deepest, with no horsepower limit and a 300 ft no wake zone along shore.",
    "berlin": "What ODNR does say: the Corps of Engineers built Berlin Lake in 1942 on the Mahoning River. Mean depth is 23 ft and maximum 55 ft, and the level can swing as much as 20 ft in a year. The bottom is mud, sand and gravel, with rock ledges along the old channel at low pool. ODNR links walleye stocking, channel catfish, crappie, largemouth, smallmouth and walleye surveys and an angler survey; they aren&rsquo;t copied here.",
    "westbranch": "What ODNR does say: the Corps of Engineers finished Michael J. Kirwan Reservoir in 1965 for flood control, water supply, recreation and fish and wildlife, and West Branch State Park opened in 1966. The 2,650 acre lake has unlimited horsepower, with no wake 300 ft from shore and west of the Rock Spring Road causeway.",
    "pymatuning": "What ODNR does say: Pennsylvania dammed Pymatuning in 1933 and Congress ratified the Ohio and Pennsylvania compact in 1937. It is 16,349 acres, the largest inland lake in Ohio, with 14,334 fishable acres and 30 ft at the deepest. ODNR manages it with the Pennsylvania Fish and Boat Commission.",
    "milton": "What ODNR does say: the City of Youngstown built Lake Milton in 1916 as an industrial water supply, with a concrete dam on the Mahoning River. Today it is a multiple use reservoir for water supply, flood control and recreation, with no horsepower restrictions. The Corps of Engineers monitors its conditions.",
    "leesville": "What ODNR does say: Leesville Lake was built across McGuire Creek in 1938, just below its north and south forks, as one of the Muskingum Watershed Conservancy District lakes. Its 27 miles of shoreline are best seen by boat, since no road circles the lake.",
    "grandlakestmarys": "What ODNR does say: Grand Lake St. Marys was built from 1837 to 1845 to store water for the Miami and Erie Canal. It covers about 12,680 acres, is Ohio&rsquo;s largest inland lake entirely within the state, and most of it is less than 7 ft deep with a soft silt bottom. Rock riprap, docks, shoreline brush and fallen trees give fish cover.",
    "caesarcreek": "What ODNR does say: the Corps of Engineers began the dam in October 1971 and started filling the lake in January 1978. At normal summer pool it covers 2,607 acres with 40 miles of shoreline, and at 115 ft near the dam it is the deepest lake in Ohio. Most bays hold standing timber and brush, and stump zones were placed along the shore.",
    "eastfork": "What ODNR does say: the Corps of Engineers began the dam in July 1970 and raised the lake to its normal pool in spring 1979. It is 113 ft deep at the dam, the second deepest lake in Ohio, with a steep and rocky 32.3 mile shoreline. Bays hold standing timber and brush, and the upper creeks were left uncleared for fish habitat.",
    "cjbrown": "What ODNR does say: the Corps of Engineers built C.J. Brown Reservoir from 1966 to 1973 and it reached its seasonal pool in spring 1975. It covers 1,970 acres with 14.15 miles of shoreline and is 50 ft deep at the dam. Standing trees remain in the western coves, and 16 groups of pilings were added as fish habitat.",
    "rockyfork": "What ODNR does say: Rocky Fork Lake was impounded in 1951 and covers 1,992 acres. It averages about 15 ft deep and reaches about 40 ft. The upper end holds stumps and the upper third is silted, and weed beds along the shoreline support sunfish and yellow perch.",
    "ladue": "What ODNR does say: LaDue Reservoir was built in 1963 on a Cuyahoga River tributary to add water supply for Akron, and ODNR Wildlife has managed its fish since 1983. The lake bed keeps the humps of the surrounding land, and vegetation is scarce, mostly milfoil and curly pondweed.",
    "paintcreek": "What ODNR does say: the Corps of Engineers began Paint Creek Dam in 1967 and the lake reached normal summer pool in May 1974. It covers 1,190 acres with 30 miles of shoreline and is 50 ft deep at the dam. Limestone bluffs line the south and east, the Rattlesnake Creek arm is shallow, and stumps, rocks and fallen trees give cover.",
    "portagelakes": "What ODNR does say: the Portage Lakes were built from 1825 as water supply reservoirs for the Ohio and Erie Canal, by damming swamps and small glacial lakes. After the canal closed in 1913 they supplied industrial water, and Nimisila Reservoir was built in the 1930s to keep them full. All lakes have a 400 hp limit.",
    "mogadore": "What ODNR does say: the City of Akron built Mogadore Reservoir in 1939 in the Little Cuyahoga River valley, for untreated industrial water and flood protection. It covers 1,104 acres, is 24 ft deep at most, and is not part of Akron&rsquo;s drinking water supply. ODNR Wildlife manages the fish.",
    "loramie": "What ODNR does say: Lake Loramie was completed in 1844 as a feeder for the Miami and Erie Canal and became a state park in 1949. ODNR lists six ramps, seasonal docks, a beach, an accessible fishing pier and a campground.",
    "nimisila": "What ODNR does say: the Ohio Department of Public Works built Nimisila Reservoir in 1936 to 1937 with WPA labor to keep the Portage Lakes full, with a gate valve at the northwest end. It covers 742 acres. Summit Metroparks took over the park land in 2015; ODNR Wildlife kept the fishery.",
    "cowan": "What ODNR does say: Cowan Lake was built on Cowan Creek in 1950. It covers 692 acres, is 42 ft deep at most and mostly 10 to 25 ft, with stumps, standing trees near the Cowan Creek mouth and lotus and lily beds in the upper lake. ODNR is drawing it down 13.5 ft from Nov. 1, 2026 for dam work.",
    "acton": "What ODNR does say: Acton Lake was formed by a dam on Four Mile Creek in 1956 and covers 590 acres. Largemouth run 4 to 22 in and live up to 15 years, saugeye reach 23 in in three years, bluegill reach 8.5 in, and crappie improved after the 9 in and 30 fish limits were removed.",
    "tappan": "What ODNR does say: Tappan Lake was impounded by a dam across Little Stillwater Creek. It has 2,131 acres of water, and its 47 miles of shoreline offer more accessible shoreline fishing than any other MWCD lake. US 250 follows the main body of the lake for 7 miles.",
    "piedmont": "What ODNR does say: the Corps of Engineers dam on Stillwater Creek brought Piedmont Lake to pool in March 1942. The lake covers 2,270 acres at 913 ft, is about 10 miles long, 38 ft at its deepest and 14.9 ft on average. ODNR says the state record muskellunge came from Piedmont.",
    "clendening": "What ODNR does say: Clendening Lake is an MWCD flood control lake on Brushy Fork of Big Stillwater Creek, with its dam at Tippecanoe. The 1,702 acre lake is mostly long, narrow and winding, most of its 35.5 miles of shoreline is deeply wooded, and it has a 10 hp limit.",
    "atwood": "What ODNR does say: Atwood Lake sits at the western edge of Dellroy along SR 542, with its dam on SR 212. MWCD built it for flood control by damming Indian Fork, a branch of Conotton Creek. It has 1,540 surface acres and 28 miles of shoreline, and motors are limited to 25 hp.",
    "charlesmill": "What ODNR does say: MWCD built Charles Mill Lake in 1935 by damming the Black Fork of the Mohican River. It holds 1,350 acres in three basins: north of SR 430 very shallow and often turbid, south of SR 430 mostly about 6 ft, and the east basin deepest, with a 27 ft hole and the clearest water.",
    "pleasanthill": "What ODNR does say: Pleasant Hill was built in 1938 on the Clear Fork of the Mohican River. The west end is under 10 ft, the middle reaches 20 ft and a steep gorge at the south bend drops to 35 ft. White bass run up the Clear Fork in spring, and saugeye bite at night off the beach area in 10 to 15 ft on a jig and minnow.",
    "beachcity": "What ODNR does say: the Beach City Wildlife Area map calls saugeye fishing good in the lake and below the dam, largemouth best in spring and early summer, northern pike a spring creek fish, and bluegill and crappie year round. It lists bluegill, largemouth bass, crappie, carp, bullhead and northern pike.",
    "wingfoot": "What ODNR does say: Wingfoot Lake was created by the Wingfoot Lake Dam, completed in 1916, to supply water to Goodyear&rsquo;s Akron plant. ODNR bought the lake and park in 2009. Any motor is allowed at idle speed only, with no wake.",
    "eastbranch": "What the official pages do say: East Branch Reservoir is the northernmost of the four City of Akron water supply reservoirs, at the headwaters of the Cuyahoga River. Headwaters Park, leased to Geauga Park District, has the only launch; the east shore and the islands are preserves.",
    "guilford": "What ODNR does say: Guilford Lake was built in 1834 as a feeder for the Sandy and Beaver Canal and rebuilt in 1932. It covers 361 acres, is 22 ft deep at most, and is drawn down about 20 ft for a dam rehabilitation, with refill planned to finish in spring 2027.",
    "highlandtown": "What ODNR does say: Highlandtown Lake was built in 1966 and first stocked in 1967 with muskellunge, largemouth bass, bluegill and channel catfish, after habitat work on the lake bottom. Boats with motors of 10 hp or less are allowed.",
    "punderson": "What ODNR does say: Punderson Lake is a natural kettle lake, the largest and deepest in Ohio. It covers 80 acres, with steep drop offs into three kettles from 30 to 57 ft. Only electric motors are allowed. ODNR Wildlife bought it in 1948 and handed it to State Parks in 1951.",
    "wellington": "What ODNR does say: Wellington Upground Reservoir is a 160 acre water supply reservoir built by the Village of Wellington in the 1970s. The village owns it; ODNR Wildlife manages the fish under an agreement. Paddle craft and electric motors only, up to 23 ft, and shore angling is abundant.",
}

DB_NETS = {k: "Linked by ODNR, not copied" for k in ("seneca", "saltfork", "burroak", "berlin")}
DB_ANG = {k: "Linked by ODNR, not copied" for k in ("seneca", "burroak", "berlin")}

def db_block(lake):
    st = DB_STOCK[lake]
    # a lake with no dashboard rows (Beach City) says so instead of inventing a species or a year
    species = ", ".join(s[0].lower() if i else s[0] for i, s in enumerate(st)) if st else "None listed on the ODNR dashboard"
    newest = f"{max(r[0] for s in st for r in s[2])} stockings" if st else "No stocking rows, 2016 to 2025"
    t, u = AREA[lake]
    return f'''      <div class="card data-glance">
        <dl class="data-glance-list">
          <div><dt>Stocked</dt><dd>{species}</dd></div>
          <div><dt>Newest record</dt><dd>{newest}</dd></div>
          <div><dt>Net surveys</dt><dd>{DB_NETS.get(lake, "No ODNR lake PDF")}</dd></div>
          <div><dt>Angler survey</dt><dd>{DB_ANG.get(lake, "None posted")}</dd></div>
        </dl>
        <p class="meta">{DB_SAYS[lake]}
        Source: <a href="{u}"{EXT}>{t}</a>.</p>
      </div>
'''

def db_stocked(lake):
    s = ""
    for sp, cols, rows in DB_STOCK[lake]:
        body = table(("Year",) + cols, rows) + f'            <p class="meta">ODNR, <a href="{DASH}"{EXT}>Fish Stocking dashboard</a>, {DB_NAME[lake]}. Years with no row had no stocking listed; a dash means none of that size.</p>\n'
        s += details(f'{sp} <span class="data-sum">{years_text(rows)}</span>', body)
    return s

def details(summary, body, open_=False):
    return (f'        <details class="how-to-read data-more"{" open" if open_ else ""}>\n'
            f'          <summary>{summary}</summary>\n          <div class="how-to-read-body">\n{body}          </div>\n        </details>\n')

NUMC = ' class="num"'
def table(cols, rows, num_from=1):
    th = "".join(f'<th scope="col"{NUMC if i >= num_from else ""}>{c}</th>' for i, c in enumerate(cols))
    trs = ""
    for r in rows:
        tds = "".join((f'<th scope="row">{v}</th>' if i == 0 else f'<td class="num">{v if v not in ("", None) else "&ndash;"}</td>') for i, v in enumerate(r))
        trs += f"                <tr>{tds}</tr>\n"
    return (f'            <div class="table-wrap data-table-wrap"><table class="data-table">\n'
            f'              <thead><tr>{th}</tr></thead>\n              <tbody>\n{trs}              </tbody>\n            </table></div>\n')

def years_text(rows):
    ys = [r[0] for r in rows]
    return str(ys[0]) if len(ys) == 1 else f"{ys[0]} to {ys[-1]}, {len(ys)} years"

def lake_block(lake):
    out = []
    st = STOCK[lake]
    # glance
    species = ", ".join(s[0].lower() if i else s[0] for i, s in enumerate(st)) or "No table posted"
    newest = "2019 stockings" if st else "None in the lake PDFs"
    out.append(f'''      <div class="card data-glance">
        <dl class="data-glance-list">
          <div><dt>Stocked</dt><dd>{species}</dd></div>
          <div><dt>Newest public table</dt><dd>{newest}</dd></div>
          <div><dt>Net surveys</dt><dd>{GROWTH[lake][0][6].split(" to ")[0]} to 2019</dd></div>
          <div><dt>Angler survey</dt><dd>{ANGLER[lake][1]}</dd></div>
        </dl>
        <p class="meta">{"From the survey and angler survey PDFs ODNR links on its lake page; it links no stocking table." if not st else "From the stocking, survey and angler survey PDFs ODNR links on its lake page."} Source: <a href="{AREA[lake][1]}"{EXT}>{AREA[lake][0]}</a>.</p>
      </div>
''')
    return "".join(out)

def stocked(lake):
    if not STOCK[lake]:
        return (f'        <p class="data-none">ODNR&rsquo;s lake PDFs for {NAME[lake]} have no stocking table. Stocking records, if any, are in ODNR&rsquo;s <a href="{STOCK_DB}"{EXT}>Fish Stocking Database</a>. Nothing is filled in here.</p>\n')
    s = ""
    for sp, f, cols, rows in STOCK[lake]:
        body = table(("Year",) + cols, rows) + f'            <p class="meta">ODNR, <a href="{pdf(f)}"{EXT}>{sp} stocking table (PDF)</a>. {NOTE}</p>\n'
        s += details(f'{sp} <span class="data-sum">{years_text(rows)}</span>', body)
    return s

def growth(lake):
    s = ""
    for sp, f, gear, a0, here, state, yrs in GROWTH[lake]:
        rows = [(f"{a0 + i}", f"{h:.1f}" if h is not None else "", f"{state[a0 + i - (0 if a0 == 0 else 1)]:.1f}" if (a0 + i - (0 if a0 == 0 else 1)) < len(state) else "") for i, h in enumerate(here)]
        i3 = 3 - a0
        lead = f'age 3: {here[i3]:.1f} in, Ohio {state[3 - (0 if a0 == 0 else 1)]:.1f}'
        body = (f'            <p>Average length in inches at each age, from ODNR {gear}. The PDF also charts catch rates by size for {yrs}.</p>\n'
                + table(("Age", name_of(lake), "Ohio avg"), rows)
                + f'            <p class="meta">ODNR, <a href="{pdf(f)}"{EXT}>{sp} survey (PDF)</a>. Copied from the PDF.</p>\n')
        s += details(f'{sp} <span class="data-sum">{lead}</span>', body)
    cf, cy = CATFISH[lake]
    s += f'        <p class="meta">Channel catfish: ODNR hoop net results from {cy} are charted in the <a href="{pdf(cf)}"{EXT}>channel catfish survey (PDF)</a>. The growth table there doesn&rsquo;t line up cleanly with its ages, so it isn&rsquo;t copied here.</p>\n'
    return s

def name_of(lake): return NAME[lake]

def anglers(lake):
    f, yr, total, rows = ANGLER[lake]
    body = table(("Fishing for", "% of anglers", "Fish per hour"), rows)
    return (f'        <p>ODNR&rsquo;s {yr} creel survey: what weekend anglers were after, and how many fish per hour those anglers caught. About <strong>{total}</strong> angler hours per weekend day in total.</p>\n'
            + body.replace("            ", "        ", 1)
            + f'        <p class="meta">ODNR, <a href="{pdf(f)}"{EXT}>{name_of(lake)} angler survey (PDF)</a>. &ldquo;Anything&rdquo; means anglers with no target species.</p>\n')

def forecast(lake):
    li = "".join(f"          <li>{t}</li>\n" for t in FORECAST[lake])
    t, u = AREA[lake]
    return (f'        <ul class="data-forecast">\n{li}        </ul>\n'
            f'        <p class="meta">Summarized from the fishing forecast on <a href="{u}"{EXT}>{t}</a>. ODNR doesn&rsquo;t date the forecast.</p>\n')

def habitat(lake):
    return (f'        <p>ODNR&rsquo;s Interactive Ohio Lake Fishing Map puts ODNR&rsquo;s own fishing layers on the lake. Layers vary by lake, so open it to see what ODNR has mapped here. The Night Bite links to it rather than copying it.</p>\n'
            f'        <p class="data-actions"><a class="btn btn-ghost" href="{ODNR_MAP[lake]}"{EXT}>Open ODNR&rsquo;s lake map</a> <a class="btn btn-ghost" href="{PDFMAP[lake]}"{EXT}>Depth map (PDF)</a></p>\n'
            f'        <p class="meta">Both are ODNR&rsquo;s. ODNR notes its depth map is not for navigation. The interactive map is large and works best on a good signal.</p>\n')

secs = []
def section(id_, title, per_lake, extra=None, db=None):
    # extra(lake) fills the same section for the NONE lakes; db(lake) for the DB lakes; without them the section shows for DATA lakes only
    shown = DATA + (DB if db else ())
    df = "" if extra else f' data-for="{" ".join(shown)}"'
    s = f'    <section id="{id_}"{df} aria-labelledby="{id_}-title">\n      <h2 id="{id_}-title">{title}</h2>\n'
    for lake in DATA:
        s += f'      <div data-for="{lake}">\n{per_lake(lake)}      </div>\n'
    if db:
        for lake in DB:
            s += f'      <div data-for="{lake}">\n{db(lake)}      </div>\n'
    if extra:
        for lake in NONE:
            s += f'      <div data-for="{lake}">\n{extra(lake)}      </div>\n'
    return s + "    </section>\n"

# BUCK_NONE unused since Buckeye Lake sections are hidden
BUCK_NONE = '        <p class="data-none">ODNR hasn&rsquo;t posted {what} for Buckeye Lake on its fishing area page. Nothing is filled in here.</p>\n'
main = f'''  <main id="main">
    <div class="page-horizon" aria-hidden="true"></div>
    <p class="breadcrumb"><a href="water">Water</a> &middot; Stocking &amp; surveys</p>
    <h1>Stocking &amp; surveys</h1>
    <p class="lead" data-for="{" ".join(DATA)}">
      What ODNR has published for <span data-lk="name">Hoover Reservoir</span>: fish stocked, how fast they grow, what anglers catch, and ODNR&rsquo;s habitat map.
      Official numbers only, each with its source.
    </p>
    <p class="lead" data-for="{" ".join(DB)}">
      What ODNR has published for <span data-lk="name">Hoover Reservoir</span>: fish stocked, from ODNR&rsquo;s Fish Stocking dashboard, and ODNR&rsquo;s habitat map. ODNR posts no lake survey PDFs here, and this page says so.
    </p>
    <p class="lead" data-for="{" ".join(NONE)}">
      What ODNR has published for <span data-lk="name">Hoover Reservoir</span>, and what it hasn&rsquo;t. Official facts only, each with its source.
    </p>
    <nav class="data-jumps" data-for="{" ".join(DATA)}" aria-label="On this page">
      <a href="#stocked">Stocked</a><a href="#growth">Growth</a><a href="#anglers">Anglers</a><a href="#habitat">Map</a>
    </nav>
    <nav class="data-jumps" data-for="{" ".join(DB)}" aria-label="On this page">
      <a href="#stocked">Stocked</a><a href="#habitat">Map</a>
    </nav>
    <div data-for="hoover">
{lake_block("hoover")}    </div>
    <div data-for="alum">
{lake_block("alum")}    </div>
    <div data-for="indian">
{lake_block("indian")}    </div>
    <div data-for="delaware">
{lake_block("delaware")}    </div>
    <div data-for="deercreek">
{db_block("deercreek")}    </div>
    <div data-for="madison">
{db_block("madison")}    </div>
    <div data-for="knox">
{db_block("knox")}    </div>
    <div data-for="clearfork">
{db_block("clearfork")}    </div>
    <div data-for="seneca">
{db_block("seneca")}    </div>
    <div data-for="dillon">
{db_block("dillon")}    </div>
    <div data-for="logan">
{db_block("logan")}    </div>
    <div data-for="saltfork">
{db_block("saltfork")}    </div>
    <div data-for="burroak">
{db_block("burroak")}    </div>
    <div data-for="dow">
{db_block("dow")}    </div>
    <div data-for="mosquito">
{db_block("mosquito")}    </div>
    <div data-for="berlin">
{db_block("berlin")}    </div>
    <div data-for="westbranch">
{db_block("westbranch")}    </div>
    <div data-for="pymatuning">
{db_block("pymatuning")}    </div>
    <div data-for="milton">
{db_block("milton")}    </div>
    <div data-for="leesville">
{db_block("leesville")}    </div>
    <div data-for="grandlakestmarys">
{db_block("grandlakestmarys")}    </div>
    <div data-for="caesarcreek">
{db_block("caesarcreek")}    </div>
    <div data-for="eastfork">
{db_block("eastfork")}    </div>
    <div data-for="cjbrown">
{db_block("cjbrown")}    </div>
    <div data-for="rockyfork">
{db_block("rockyfork")}    </div>
    <div data-for="ladue">
{db_block("ladue")}    </div>
    <div data-for="paintcreek">
{db_block("paintcreek")}    </div>
    <div data-for="portagelakes">
{db_block("portagelakes")}    </div>
    <div data-for="mogadore">
{db_block("mogadore")}    </div>
    <div data-for="loramie">
{db_block("loramie")}    </div>
    <div data-for="nimisila">
{db_block("nimisila")}    </div>
    <div data-for="cowan">
{db_block("cowan")}    </div>
    <div data-for="acton">
{db_block("acton")}    </div>
    <div data-for="tappan">
{db_block("tappan")}    </div>
    <div data-for="piedmont">
{db_block("piedmont")}    </div>
    <div data-for="clendening">
{db_block("clendening")}    </div>
    <div data-for="atwood">
{db_block("atwood")}    </div>
    <div data-for="charlesmill">
{db_block("charlesmill")}    </div>
    <div data-for="pleasanthill">
{db_block("pleasanthill")}    </div>
    <div data-for="beachcity">
{db_block("beachcity")}    </div>
    <div data-for="wingfoot">
{db_block("wingfoot")}    </div>
    <div data-for="eastbranch">
{db_block("eastbranch")}    </div>
    <div data-for="guilford">
{db_block("guilford")}    </div>
    <div data-for="highlandtown">
{db_block("highlandtown")}    </div>
    <div data-for="punderson">
{db_block("punderson")}    </div>
    <div data-for="wellington">
{db_block("wellington")}    </div>
    <div data-for="buckeye">
      <div class="card data-glance">
        <p class="data-none">ODNR&rsquo;s Buckeye Lake fishing area page has no stocking tables, net surveys, angler survey or fishing forecast. This page says so rather than guess.</p>
        <p class="meta">What ODNR does say: Buckeye Lake was built about 1830. It averages about 6 ft deep with a maximum of about 14 ft, and has a relatively flat bottom without much underwater woody cover. No horsepower limit.
        Source: <a href="{AREA["buckeye"][1]}"{EXT}>{AREA["buckeye"][0]}</a>.</p>
      </div>
    </div>
    <div data-for="oshaughnessy">
      <div class="card data-glance">
        <p class="data-none">ODNR&rsquo;s O&rsquo;Shaughnessy Reservoir fishing area page has no stocking tables, net surveys, angler survey or fishing forecast. This page says so rather than guess.</p>
        <p class="meta">What ODNR does say: the City of Columbus built the reservoir in 1925 on the Scioto River. It is 912 acres with 18.4 miles of shoreline, over 40 ft deep near the dam though much of it is 20 ft or less, with rock bottom in the south and mud and silt in the north.
        Source: <a href="{AREA["oshaughnessy"][1]}"{EXT}>{AREA["oshaughnessy"][0]}</a>. ODNR&rsquo;s <a href="https://ohiodnr.gov/discover-and-learn/education-training/wild-ohio-harvest-community/fishing-tips"{EXT}>Hybrid Striped Bass Fishing Tips</a> list O&rsquo;Shaughnessy among the lakes the Division of Wildlife stocks with hybrid striped bass; the numbers aren&rsquo;t posted there.</p>
      </div>
    </div>
    <div data-for="griggs">
      <div class="card data-glance">
        <p class="data-none">ODNR&rsquo;s Griggs Reservoir fishing area page has no stocking tables, net surveys, angler survey or fishing forecast. This page says so rather than guess.</p>
        <p class="meta">What ODNR does say: the dam was built on the Scioto River in 1904, making a narrow lake about six miles long with 387 surface acres. Depths can pass 20 ft near the dam, but most of the lake is 10 to 15 ft. It is generally clear but turns muddy after heavy rain.
        Source: <a href="{AREA["griggs"][1]}"{EXT}>{AREA["griggs"][0]}</a>. ODNR&rsquo;s <a href="https://ohiodnr.gov/discover-and-learn/education-training/wild-ohio-harvest-community/fishing-tips"{EXT}>Hybrid Striped Bass Fishing Tips</a> list Griggs among the lakes stocked with hybrid striped bass, and ODNR&rsquo;s <a href="https://ohiodnr.gov/discover-and-learn/safety-conservation/about-ODNR/news/central-ohio-is-a-fishing-destination-for-crappie-bass-and-catfish"{EXT}>June 12, 2026 news release</a> says Griggs has a strong population of large hybrids, often over 20 inches. No numbers are posted.</p>
      </div>
    </div>
    <p class="meta data-dates" data-for="{" ".join(DB)}">Stocking numbers for <span data-lk="name">Hoover Reservoir</span> are read from ODNR&rsquo;s public <a href="{DASH}"{EXT}>Fish Stocking dashboard</a> (data updated Oct. 27, 2026), last ten years. Checked Oct. 30, 2026; the six east and southeast lakes Oct. 31, 2026; the six northeast lakes Nov. 3, 2026; Grand Lake St. Marys, Caesar Creek Lake, East Fork Lake, C.J. Brown Reservoir, Rocky Fork Lake, LaDue Reservoir, Paint Creek Lake, the Portage Lakes, Mogadore Reservoir, Lake Loramie, Nimisila Reservoir, Cowan Lake, Acton Lake, Tappan Lake, Piedmont Lake, Clendening Lake, Atwood Lake, Charles Mill Lake, Pleasant Hill Lake and Beach City Lake Nov. 9, 2026; Wingfoot Lake, East Branch Reservoir, Guilford Lake, Highlandtown Lake, Punderson Lake and Wellington Upground Reservoir Nov. 10, 2026.</p>
    <p class="meta data-dates" data-for="{" ".join(DATA + NONE)}">ODNR&rsquo;s lake PDFs run through 2019. Newer stocking is in ODNR&rsquo;s <a href="{STOCK_DB}"{EXT}>Fish Stocking Database</a> on DataOhio, which asked for a sign in, so it isn&rsquo;t copied here. Checked Oct. 27, 2026.</p>
'''
main += section("stocked", "Fish stocked", stocked, "", db_stocked)
main += section("growth", "Net surveys: growth", growth, "")
main += section("anglers", "Angler survey", anglers, "")
main += section("forecast", "ODNR&rsquo;s fishing forecast", forecast, "")
main += section("habitat", "Habitat map", habitat, habitat, habitat)
main += '''
    <div class="callout">
      The Night Bite is unofficial and personal: <strong>not ODNR</strong>. Numbers here are copied from ODNR&rsquo;s public pages and PDFs and dated; check the source before you rely on one.
    </div>
'''
html = head + main + foot
(R / "stocking.html").write_text(html)
print("wrote stocking.html", len(html))
