#!/usr/bin/env python3
"""Builds stocking.html (Stocking & surveys) from ODNR public PDFs. Values typed from the PDF tables and checked against
the rendered PDFs, Oct. 27, 2026 (Indian Lake and Delaware Lake: Oct. 29, 2026, from pdftotext -layout of the same PDFs). The six east and
southeast lakes (Seneca, Dillon, Logan, Salt Fork, Burr Oak, Dow) come from ODNR's Fish Stocking dashboard, read Oct. 31, 2026. Reuses ice.html's head and footer. Run, then tools/stamp-version.py."""
import pathlib, re
R = pathlib.Path(__file__).resolve().parent.parent
ice = (R / "ice.html").read_text()
head = ice[:ice.index("  <main id=\"main\">")]
foot = ice[ice.index("  </main>"):]
head = re.sub(r"<title>[^<]*</title>", "<title>Stocking &amp; surveys: Ohio lakes | The Night Bite</title>", head, count=1)
head = re.sub(r'<meta name="description" content="[^"]*">',
              '<meta name="description" content="ODNR stocking, net surveys and angler surveys for Hoover, Alum Creek, Buckeye Lake and 14 more Ohio lakes, with sources.">', head)
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
DB = ("deercreek", "madison", "knox", "clearfork", "seneca", "dillon", "logan", "saltfork", "burroak", "dow")
DB_NAME = {"deercreek": "Deer Creek Lake", "madison": "Madison Lake", "knox": "Knox Lake", "clearfork": "Clear Fork Reservoir",
           "seneca": "Seneca Lake", "dillon": "Dillon Lake", "logan": "Lake Logan", "saltfork": "Salt Fork Lake", "burroak": "Burr Oak Lake", "dow": "Dow Lake"}
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
}

DB_NETS = {k: "Linked by ODNR, not copied" for k in ("seneca", "saltfork", "burroak")}
DB_ANG = {k: "Linked by ODNR, not copied" for k in ("seneca", "burroak")}

def db_block(lake):
    st = DB_STOCK[lake]
    species = ", ".join(s[0].lower() if i else s[0] for i, s in enumerate(st))
    newest = max(r[0] for s in st for r in s[2])
    t, u = AREA[lake]
    return f'''      <div class="card data-glance">
        <dl class="data-glance-list">
          <div><dt>Stocked</dt><dd>{species}</dd></div>
          <div><dt>Newest record</dt><dd>{newest} stockings</dd></div>
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
    <p class="meta data-dates" data-for="{" ".join(DB)}">Stocking numbers for <span data-lk="name">Hoover Reservoir</span> are read from ODNR&rsquo;s public <a href="{DASH}"{EXT}>Fish Stocking dashboard</a> (data updated Oct. 27, 2026), last ten years. Checked Oct. 30, 2026; the six east and southeast lakes Oct. 31, 2026.</p>
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
