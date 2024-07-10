#! /bin/sh

links() {
	file="$1"
	from=$(echo "$file" | sed 's/index\.html$//')
	cat "dist$file" | tr ' >' '\n\n' | grep 'href="' | sed 's/href="\(.*\)"/\1/' |\
	awk '\
	/^javascript:/ { next }\
	/^https?:/ { next }\
	/^#/ { print "'"$from"'", "'"$from"'" $0; next }\
	/^\.\./ { print "'"$from"'", "'"$from"'" $0; next }\
	/^\.$/ { print "'"$from"'", "'"$from"'"; next }\
	/^\.\/#$/ {print "'"$from"'", "'"$from"'"; next }\
	/^\.\// { match($0, /^\.\/(.*)/, arr); print "'"$from"'", "'"$from"'" arr[1]; next }\
	/^\// { print "'"$from"'", $0; next }\
	{ print "@", $0, "'"$from"'" }\
	'
}

anchors() {
	file="$1"
	from=$(echo "$file" | sed 's/index\.html$//')
	cat "dist$file" | tr ' >' '\n\n' | grep 'id="' | sed 's/id="\(.*\)"/\1/' | \
	awk '{ print "'"$from"'#" $0, "'"$from"'#" $0}END{$0="top";print "'"$from"'#" $0, "'"$from"'#" $0}'
}
files=$(find dist -type f -name "*.html" | sed 's/^dist//')
for file in $files; do
	links="$links $(links $file)\n"
	links="$links $(anchors $file)"
done
css=$(find dist/_astro -type f -name "*.css" | sed 's/^dist//')
css=$(echo "$css" | awk '{print $0"/", $0"/"}')
echo "$css $links" | grep -v "/404.html " | awk '{target=clean($2); def[$1]=target; use[target]=$1} END {\
  for (target in use) if (!(target in def)) print "broken link from", use[target], "to", target;\
	for (from in def) if (!(from in use)) print "unused page", from;\
} function clean(x) { while (gsub(/\/[^/]*\/\.\./, "", x)); return x }' | sort

