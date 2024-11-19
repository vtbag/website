#! /bin/bash


subtract_lists() {
  echo "$1" | tr ' ' '\n' | grep -Fxv -f <(echo "$2"|tr ' ' '\n')
}

htmls=$(find  dist -type f -name "*.html" | sort)

desc=$(grep -l '"og:description"' $htmls)
no_desc=$(subtract_lists "$htmls" "$desc")

echo $no_desc
exit
done=$(grep -o '"og:image" content="[^"]*"' $htmls|grep -v "https://vtbag.dev/social.png" | col1 :)

done+=" dist/index.html"
done=$(echo "$done" | tr ' ' '\n' | sort)
todo=$(subtract_lists "$htmls" "$done")
echo $todo
exit

find dist -type f -name "*.html" -exec grep -H  -o '"og:url" content="[^"]*"' {} \; | sed -e 's/:/ /' -e 's/=/ /' -e 's/"//g' -e 's|og:url content https://vtbag.dev||' > pages

awk < pages '{print "test(\"" $2 "\", async ({ page }) => {await shoot(page, \"" $2 "\")});"; system("mkdir -p public/" $2);}' | sort

awk < pages '{print $1, $2}' | while read -r file url ; do
  cmd="s|<meta property=\"og:image\" content=\"[^\"]*\">|<meta property=\"og:image\" content=\"${url}og.png\">|"
  sed -i.bak -e "${cmd}" $file
done



