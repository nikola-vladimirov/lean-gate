# WordPress.org plugin review checks. Sourced by bin/lean-gate.
#   lean-gate audit wporg [plugin dir or release zip]
# One pass over the release package for what the plugin review team sends back: the 18 detailed plugin guidelines
# (G1 to G18) and the review emails' common issues (enqueue, sanitizing, nonces, file locations, external services,
# translations, dev files, outdated libraries). Read-only and heuristic: each line is something to read, not proof.
# The full rule list with sources: skills/lean-gate/reference/wp-plugin-handbook.md.

# Line checks on the plugin's own PHP and JS (vendor is third-party code: only its files, licenses and versions are judged).
WPORG_AWK='
  { sub(/\r$/, ""); line[NR] = $0; all = all $0 "\n" }
  function out(i, msg) { printf "%s:%d: %s\n", rel, i, msg }
  function once(k, i, msg) { if (!(k in done)) { done[k] = 1; out(i, msg) } }
  END {
    # A write is judged when the plugin never resolves uploads, a WP-CLI file never does (a user-given path), or the path is named on the line.
    loose = !uploads_any || (all ~ /WP_CLI/ && all !~ /wp_upload_dir/)
    notices_ok = all ~ /is-dismissible|get_current_screen|\$hook_suffix|\$pagenow|\$_GET\[["\047]page["\047]\]|dismiss/
    for (i = 1; i <= NR; i++) {
      l = line[i]
      if (l ~ /^[ \t]*(\/\/|#|\*|\/\*)/) continue
      if (l ~ /wp_enqueue_code_editor|wp\.codeEditor|CodeMirror|ScssPhp|scssphp|Less_Parser|->compileString[ \t]*\(/) once("editor", i, "code editor or CSS compiler: wp.org forbids saving user CSS, JS or PHP; ask for values in fields and generate the code, or keep it out of the wp.org build")
      # G4: obfuscated code.
      t = l; hex = gsub(/\\x[0-9a-fA-F][0-9a-fA-F]/, "", t)
      if (l ~ /eval[ \t]*\([ \t]*(base64_decode|gzinflate|gzuncompress|str_rot13|strrev|hex2bin)|eval\(function\(p,a,c,k,e/ || hex >= 20) once("obf", i, "G4: obfuscated or packed code: ship readable code (minified JS is fine with its source)")
      # G5: features locked behind a licence, a trial or a quota.
      if (l ~ /(is_pro|is_premium|has_pro|is_license_(valid|active)|license_is_valid|trial_(days|ends|expired|remaining|period)|days_left_in_trial)[ \t]*\(/) once("trial", i, "G5: feature gated on a licence or trial: no locked or expiring features on wp.org; put paid code in a separate add-on")
      # G7: tracking without opt-in.
      if (l ~ /telemetry|usage[_-]tracking|google-analytics\.com|googletagmanager\.com|gtag[ \t]*\(|hotjar|mixpanel|api\.segment\.io|sentry\.io|posthog/) once("track", i, "G7: tracking or telemetry: only after explicit opt-in (off by default), documented in readme.txt")
      # G8: code, updates or installs from outside WordPress.org; CDN assets; admin iframes.
      if (l ~ /pre_set_site_transient_update_plugins|site_transient_update_plugins|plugins_api|Puc_v[0-9]|PucFactory|Plugin_Upgrader|Theme_Upgrader|upgrader_pre_download/) once("update", i, "G8: updates or installs from outside WordPress.org: wp.org plugins update only through wp.org")
      if (l ~ /wp_(enqueue|register)_(script|style)[ \t]*\(.*["\047](https?:)?\/\/|<script[^>]+src=["\047](https?:)?\/\/|<link[^>]+href=["\047](https?:)?\/\// && l !~ /fonts\.(googleapis|gstatic|bunny)|plugins_url|plugin_dir_url|get_template_directory_uri|get_stylesheet_directory_uri|admin_url|home_url|site_url|includes_url/) out(i, "G8: JS or CSS from a CDN: bundle it in the plugin (fonts and a documented service own scripts are the only exceptions)")
      if (lang == "php" && l ~ /<iframe/) once("iframe", i, "G8: iframe: admin pages may not be framed from a service (use its API); front-end embeds of a documented service are fine")
      # G9: using the visitor or server without permission.
      if (l ~ /coinhive|coin-hive|cryptonight|coinimp|webminepool|crypto-loot/) out(i, "G9: crypto mining: never")
      # G10: credits on the public site.
      if (l ~ /[Pp]owered [Bb]y/) once("credit", i, "G10: credit or Powered by link: on the public site it must be an opt-in setting, off by default")
      # G11: notices that hijack the dashboard.
      if (l ~ /add_action[ \t]*\([ \t]*["\047](admin_notices|all_admin_notices|network_admin_notices)["\047]/ && !notices_ok) once("notice", i, "G11: admin notice on every screen: make it dismissible (is-dismissible plus a stored dismissal) or show it only on the plugin screens")
      if (l ~ /remove_all_actions[ \t]*\([ \t]*["\047](admin_notices|all_admin_notices)["\047]/) out(i, "G11: removes every other plugin notice: hide only your own")
      if (lang == "js") continue
      # Plugin Handbook common review issues.
      if (l ~ /<<<[ \t]*["\047]?[A-Za-z_]/) once("heredoc", i, "HEREDOC or NOWDOC: reviewers reject it (escaping cannot be checked); build the string with escaped parts")
      if (l ~ /<\?([ \t]|$)/) out(i, "short open tag: use <?php")
      if (l ~ /(^|[^a-z_])_ex?[ \t]*\(|echo[ \t]+(__|_x|_n|esc_url_raw)[ \t]*\(/) out(i, "translated or raw text echoed unescaped: esc_html_e(), esc_html__(), esc_attr__() (or esc_url() for URLs)")
      if (l ~ /(^|[^a-z_])(__|_e|_x|_n|esc_html__|esc_attr__|esc_html_e|esc_attr_e)[ \t]*\([ \t]*\$/) out(i, "gettext with a variable as the text: translation tools need a literal string (and a literal text domain)")
      if (l ~ /foreach[ \t]*\([ \t]*\$_(POST|GET|REQUEST)[ \t]+as|array_map[ \t]*\(.*\$_(POST|GET|REQUEST)[ \t]*\)/ && l !~ /sanitize_|map_deep/) out(i, "whole request array processed: read only the fields you need, each with its own sanitize_* function")
      if (l ~ /curl_(init|exec|setopt)[ \t]*\(/) once("curl", i, "raw cURL: use the HTTP API (wp_remote_get, wp_remote_post, wp_safe_remote_get)")
      if (l ~ /ini_set[ \t]*\([ \t]*["\047](memory_limit|max_execution_time|display_errors)|date_default_timezone_set[ \t]*\(|(^|[^a-z_>])(error_reporting|set_time_limit)[ \t]*\(/) out(i, "changes global PHP settings for the whole site: leave them to the host and WordPress")
      if (l ~ /^function[ \t]+(wp_|__|_)[A-Za-z0-9_]*[ \t]*\(/) out(i, "function name uses a prefix WordPress reserves (wp_, _ or __): prefix it with the plugin slug")
      if (l ~ /(^|[^a-z_])(activate_plugins?|deactivate_plugins)[ \t]*\(/) once("plugins", i, "activates or deactivates plugins: never change other plugins state; show a notice with the dependency instead (Requires Plugins header)")
      if (l ~ /ALLOW_UNFILTERED_UPLOADS/) out(i, "ALLOW_UNFILTERED_UPLOADS: never; allow file types with the upload_mimes filter")
      if (l ~ /register_setting[ \t]*\([ \t]*["\047][^"\047]+["\047][ \t]*,[ \t]*["\047][^"\047]+["\047][ \t]*\)/) out(i, "register_setting without a sanitize_callback: pass array( \"sanitize_callback\" => ... )")
      if (l ~ /<(script|style)([ \t>]|$)/ && l !~ /ld\+json|text\/(template|html|x-template)/) out(i, "inline <script> or <style> printed: use wp_enqueue_script/style, wp_add_inline_script or wp_add_inline_style")
      if (l ~ /wp_verify_nonce[ \t]*\(/ && l ~ /\$_|\$[a-zA-Z_]+\[/ && l !~ /sanitize_text_field|sanitize_key/) out(i, "nonce reaches wp_verify_nonce unsanitized: wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST[\"x\"] ) ), ... )")
      if ((l ~ /wp_unslash[ \t]*\([ \t]*\$_(POST|GET|REQUEST|COOKIE)[ \t]*\)/ || l ~ /=[ \t]*\$_(POST|GET|REQUEST|COOKIE)[ \t]*;/) && l !~ /map_deep|sanitize_/) out(i, "whole request array copied unsanitized: read each field with its own sanitize_* function")
      if (l ~ /json_decode[ \t]*\(/ && l ~ /\$_(POST|GET|REQUEST|COOKIE|SERVER)/ && l !~ /map_deep|sanitize_/) out(i, "json_decode on request data does not sanitize: sanitize in the same statement, e.g. map_deep( json_decode( ... ), \"sanitize_text_field\" )")
      if (l ~ /file_put_contents[ \t]*\(|->put_contents[ \t]*\(|fopen[ \t]*\(.*["\047][waxc]b?\+?["\047]|(^|[^a-z_])(mkdir|wp_mkdir_p|copy|move_uploaded_file)[ \t]*\(/) {
        if (loose || l ~ /__DIR__|__FILE__|plugin_dir_path|WP_PLUGIN_DIR|ABSPATH|WP_CONTENT_DIR|get_template_directory|get_stylesheet_directory|\$assoc_args|\$args\[/) out(i, "writes a file outside uploads: write only under wp_upload_dir()[\"basedir\"] . \"/<plugin-slug>/\" (never the plugin folder, wp-content root or a user-given path); prefer options")
      }
    }
  }'

# Hosts the plugin's own code links to or calls: each must be in the readme's == External services == section (G6, G7).
# shortcut: matches on the last two labels of the host (developer.woocommerce.com -> woocommerce.com); a .co.uk host matches loosely.
wporg_hosts() { # $1 root, then files on stdin
  local root="$1" f
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    awk -v rel="${f#"$root"/}" '
      { sub(/\r$/, "") }
      /^[ \t]*(\/\/|#|\*|\/\*)/ || /(Plugin|Author|Update) URI:/ || /xmlns/ { next }
      { s = $0
        while (match(s, /https?:\/\/[A-Za-z0-9.-]+\.[A-Za-z]+/)) {
          h = tolower(substr(s, RSTART, RLENGTH)); sub(/^https?:\/\//, "", h); s = substr(s, RSTART + RLENGTH)
          if (h ~ /(^|\.)(wordpress\.org|w\.org|gnu\.org|w3\.org|schema\.org|openxmlformats\.org|purl\.org|example\.(com|org|net)|localhost|test)$/) continue
          if (!(h in seen)) { seen[h] = 1; printf "%s\t%s:%d\n", h, rel, NR }
        }
      }' "$f"
  done
}

# A header value from a plugin file or readme.txt ("Version: 1.2" -> 1.2), or empty.
wporg_field() { tr -d '\r' < "$1" 2>/dev/null | sed -n "s/^[[:space:]/*#@]*$2:[[:space:]]*//p" | head -n 1 | sed 's/[[:space:]]*$//'; }

GPL_OK='GPL|MIT|Expat|BSD|ISC|Apache|MPL|Zlib|Unlicense|CC0|Artistic|WTFPL|PHP-3|Public Domain'

# Readme, header, license, version and package checks. $1 plugin root, $2 main file (may be empty), $3 readme.
wporg_meta() {
  local dir="$1" main="$2" readme="$3" name ver lic td slug st rlic tags n short const rname tm min v f
  if [ -z "$main" ]; then echo "plugin: no PHP file in the root with a Plugin Name: header"; else
    name=$(wporg_field "$main" 'Plugin Name'); ver=$(wporg_field "$main" Version); lic=$(wporg_field "$main" License); td=$(wporg_field "$main" 'Text Domain')
    # G1: GPL-compatible license, declared.
    [ -n "$lic" ] || echo "${main#"$dir"/}: G1: no License: header (use GPLv2 or later, with License URI:)"
    [ -z "$lic" ] || echo "$lic" | grep -Eqi "$GPL_OK" || echo "${main#"$dir"/}: G1: License: $lic is not GPL-compatible"
    [ -n "$ver" ] || echo "${main#"$dir"/}: G15: no Version: header"
    [ -n "$td" ] || echo "${main#"$dir"/}: no Text Domain: header (it must equal the plugin slug)"
    # A version constant in the main file must follow the header.
    const=$(tr -d '\r' < "$main" | grep -Ev "define\([[:space:]]*['\"]([A-Z0-9_]*(PHP|MIN|REQUIRE|DB|TESTED)[A-Z0-9_]*|(WP|WC)_[A-Z0-9_]*|[A-Z0-9_]*_(WP|WC)_[A-Z0-9_]*)['\"]" | sed -n "s/.*define([[:space:]]*['\"][A-Z0-9_]*VERSION['\"][[:space:]]*,[[:space:]]*['\"]\([^'\"]*\)['\"].*/\1/p" | head -n 1)
    [ -n "$const" ] && [ -n "$ver" ] && [ "$const" != "$ver" ] && echo "${main#"$dir"/}: G15: version constant $const does not match Version: $ver"
    # G17: trademarks and project names may not start the slug or the name; the slug may never contain wordpress.
    slug="${td:-$(basename "$dir")}"
    tm='^(wordpress|woocommerce|woo|gutenberg|jetpack|akismet|bbpress|buddypress|google|gmail|youtube|facebook|instagram|whatsapp|meta|twitter|tiktok|linkedin|pinterest|telegram|discord|amazon|apple|microsoft|paypal|stripe|shopify|ebay|etsy|aliexpress|temu|elementor|divi|yoast|mailchimp|zoom|slack|openai|chatgpt|anthropic|cloudflare|contact-form-7|wpforms|gravity-forms|advanced-custom-fields|acf)(-|$)'
    echo "$slug" | grep -qi wordpress && echo "plugin slug $slug: G17: may not contain wordpress"
    echo "$slug" | grep -qi plugin && echo "plugin slug $slug: avoid the word plugin in the slug (Developer FAQ)"
    [ "$(basename "$main" .php)" = "$slug" ] || echo "${main#"$dir"/}: main file name should be the slug: $slug.php"
    [ -d "$dir/vendor" ] && [ ! -f "$dir/composer.json" ] && echo "vendor/: shipped without composer.json; include it so the libraries and licenses can be checked"
    echo "$slug" | tr 'A-Z' 'a-z' | grep -Eq "$tm" && echo "plugin slug $slug: G17: starts with a trademark or project name: use \"<Your Name> for <Brand>\" unless you own the brand"
    echo "$name" | tr 'A-Z ' 'a-z-' | grep -Eq "$tm" && echo "Plugin Name: $name: G17: starts with a trademark or project name: put it after for, with or using"
    [ -n "$td" ] && [ -n "$tmpdir_slug" ] && [ "$td" != "$tmpdir_slug" ] && echo "${main#"$dir"/}: Text Domain $td does not match the plugin folder $tmpdir_slug"
  fi
  if [ ! -f "$readme" ]; then echo "readme.txt: missing"; return 0; fi
  st=$(wporg_field "$readme" 'Stable tag'); rlic=$(wporg_field "$readme" License); tags=$(wporg_field "$readme" Tags)
  for f in Contributors Tags 'Requires at least' 'Tested up to' 'Requires PHP' 'Stable tag' License; do
    [ -n "$(wporg_field "$readme" "$f")" ] || echo "readme.txt: no $f: field"
  done
  # G3 and G15: the directory serves the Stable tag; it must be the current version, with a changelog entry.
  [ "$(wc -c < "$readme")" -gt 10240 ] && echo "readme.txt: over 10 KB; move the long changelog to changelog.txt and keep the latest versions"
  for f in 'Tested up to' 'Requires at least' 'Requires PHP'; do
    v=$(wporg_field "$readme" "$f"); [ -z "$v" ] || echo "$v" | grep -Eq '^[0-9]+(\.[0-9]+){0,2}$' || echo "readme.txt: $f: $v is not a plain version number"
  done
  [ "$st" = trunk ] && echo "readme.txt: G3: Stable tag: trunk; point it at the released version tag"
  [ -n "$st" ] && [ -n "${ver:-}" ] && [ "$st" != trunk ] && [ "$st" != "$ver" ] && echo "readme.txt: G15: Stable tag $st does not match the plugin Version: $ver"
  [ -n "${ver:-}" ] && ! tr -d '\r' < "$readme" | grep -Eq "^=+[[:space:]]*v?$(printf '%s' "$ver" | sed 's/\./\\./g')([[:space:]]|=|$)" && echo "readme.txt: G15: no == Changelog == entry for $ver"
  [ -z "$rlic" ] || echo "$rlic" | grep -Eqi "$GPL_OK" || echo "readme.txt: G1: License: $rlic is not GPL-compatible"
  # G12: at most 5 tags, none repeated; disclosed, direct affiliate links only.
  n=$(printf '%s' "$tags" | tr ',' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | grep -c .)
  [ "$n" -gt 5 ] && echo "readme.txt: G12: $n tags; the directory uses the first 5 and more is spam"
  [ "$(printf '%s' "$tags" | tr ',' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | tr 'A-Z' 'a-z' | grep . | sort | uniq -d | grep -c .)" -gt 0 ] && echo "readme.txt: G12: a tag is repeated"
  grep -Eni '[?&](ref|aff|affid|affiliate)=|/go/|bit\.ly/|tinyurl\.com|goo\.gl/' "$readme" | head -n 3 | sed 's/^\([0-9]*\):.*/readme.txt:\1: G12: affiliate or short link: disclose it and link straight to the service/'
  # G9: no promise of legal compliance.
  grep -Eni '(gdpr|ccpa|ada|wcag|hipaa|pci)[- ]?compliant|guarantee[sd]? (legal )?compliance|fully compliant|legally compliant|100% compliant' "$readme" | head -n 3 | sed 's/^\([0-9]*\):.*/readme.txt:\1: G9: promises legal compliance; say it helps with, not that it guarantees/'
  # G16: complete, no placeholders.
  grep -Eni 'lorem ipsum|coming soon' "$readme" | head -n 2 | sed 's/^\([0-9]*\):.*/readme.txt:\1: G16: placeholder text; submit a complete plugin/'
  rname=$(tr -d '\r' < "$readme" | sed -n 's/^===[[:space:]]*\(.*[^[:space:]]\)[[:space:]]*===[[:space:]]*$/\1/p' | head -n 1)
  [ -n "${name:-}" ] && [ -n "$rname" ] && [ "$rname" != "$name" ] && echo "readme.txt: plugin name \"$rname\" differs from Plugin Name: \"$name\""
  # Short description: the first text line after the header block, at most 150 characters.
  short=$(tr -d '\r' < "$readme" | awk 'NR > 1 && !body && /^[ \t]*$/ { body = 1; next } body && /[^ \t]/ { print; exit }')
  [ "${#short}" -gt 150 ] && echo "readme.txt: short description is ${#short} characters; the directory cuts it at 150"
  # G4: minified JS needs its source in the package or a link to it in the readme.
  min=$(find_files "$dir" -name '*.js' | while IFS= read -r f; do
    [ -f "${f%.min.js}.js" ] && [ "${f%.min.js}" != "$f" ] && continue
    awk 'length > 5000 { found = 1; exit } END { exit !found }' "$f" && echo "${f#"$dir"/}"
  done | head -n 5 | tr '\n' ' ')
  [ -n "$min" ] && ! grep -Eqi 'source|github\.com|gitlab\.com|bitbucket\.org' "$readme" && echo "G4: minified JS with no source in the package and no source link in readme.txt: $min"
  return 0
}

cmd_audit_wporg() {
  local src="${1:-.}" dir tmp="" lang out files readme sub host where dom libs main ups ext f
  tmpdir_slug=""
  if [ -f "$src" ] && [ "${src%.zip}" != "$src" ]; then
    tmp=$(mktemp -d)
    unzip -q "$src" -d "$tmp" 2>/dev/null || tar -xf "$src" -C "$tmp" 2>/dev/null || { rm -rf "$tmp"; die "audit wporg: cannot unzip $src (needs unzip or bsdtar)"; }
    dir="$tmp"
  else
    [ -d "$src" ] || die "audit wporg: give a plugin folder or its release zip"
    dir=$(cd "$src" && pwd -P)
  fi
  # A zip holds one plugin folder: the plugin root is that folder, and its name is the slug.
  if [ ! -f "$dir/readme.txt" ]; then
    sub=$(find "$dir" -mindepth 1 -maxdepth 1 -type d ! -name '.*' | head -n 2)
    [ "$(printf '%s\n' "$sub" | grep -c .)" = 1 ] && [ -f "$sub/readme.txt" ] && dir="$sub"
  fi
  [ -n "$tmp" ] && [ "$dir" != "$tmp" ] && tmpdir_slug=$(basename "$dir")
  readme="$dir/readme.txt"
  main=$(grep -l 'Plugin Name:' "$dir"/*.php 2>/dev/null | head -n 1)
  files=$(find_files "$dir" \( -name '*.php' -o -name '*.js' \) | sort)
  ups=0; printf '%s\n' "$files" | tr '\n' '\0' | xargs -0 grep -l wp_upload_dir 2>/dev/null | grep -q . && ups=1
  # The External services section, lowercased: hosts must be named there, not anywhere in the readme.
  ext=""; [ -f "$readme" ] && ext=$(awk '/^== *[Ee]xternal [Ss]ervices *==/ { on = 1; print "x"; next } /^== / { on = 0 } on { print tolower($0) }' "$readme")
  out=$(
    while IFS= read -r f; do
      [ -n "$f" ] || continue
      lang=js; [ "${f%.php}" = "$f" ] || lang=php
      awk -v rel="${f#"$dir"/}" -v lang="$lang" -v uploads_any="$ups" "$WPORG_AWK" "$f"
    done <<EOF
$files
EOF
    # Direct file access: every PHP file stops when loaded outside WordPress.
    # An index.php that only says "Silence is golden" and translation files have nothing to run.
    f=$(printf '%s\n' "$files" | grep '\.php$' | grep -v '/languages/' | tr '\n' '\0' | xargs -0 grep -L 'ABSPATH\|WPINC\|WP_UNINSTALL_PLUGIN\|Silence is golden' 2>/dev/null | sed "s|^$dir/||")
    [ -n "$f" ] && echo "$(printf '%s\n' "$f" | grep -c .) PHP file(s) without a direct-access guard (defined( 'ABSPATH' ) || exit;): $(printf '%s\n' "$f" | head -n 5 | tr '\n' ' ')"
    wporg_meta "$dir" "$main" "$readme"
    # G6 and G7: every outside host in code is named in == External services == (what, which data, when, terms, privacy).
    # Translation files are reported below as a whole; their strings are not scanned for hosts.
    printf '%s\n' "$files" | grep -v '/languages/' | wporg_hosts "$dir" | while IFS="$(printf '\t')" read -r host where; do
      dom=$(echo "$host" | awk -F. '{ print (NF > 1 ? $(NF-1) "." $NF : $0) }')
      if [ -z "$ext" ]; then
        echo "$where: links or calls $host, and readme.txt has no == External services == section (what the service is, what data is sent and when, terms and privacy links)"
      elif [[ "$ext" != *"$dom"* ]]; then
        echo "$where: $host is not named in readme.txt == External services == (add it with its terms and privacy links, or remove the link)"
      fi
    done
    # Package contents: dev folders and files, and bundled translations (translate.wordpress.org serves those).
    find "$dir" \( -path "$dir/.git" -prune \) -o \( -name '.?*' -o -name node_modules -o -name bower_components -o -name tests -o -name test -o -name __tests__ \
      -o -name 'phpunit.xml*' -o -name '*.log' -o -name '*.sql' -o -name '*.zip' -o -name Thumbs.db \) -print -prune 2>/dev/null \
      | sed "s|^$dir/||" | sort | sed 's/$/: dev or hidden file in the package: leave it out of the wp.org zip (composer.json and package.json may stay)/'
    find "$dir" -path "$dir/.git" -prune -o -type f \( -name '*.po' -o -name '*.mo' -o -name '*.l10n.php' -o -path '*/languages/*_[A-Z][A-Z]*.php' -o -path '*/languages/*_[A-Z][A-Z]*.json' \) -print 2>/dev/null \
      | sed "s|^$dir/||" | sort | sed 's/$/: translation file in the package: drop it from the wp.org build (translate.wordpress.org serves translations; .pot may stay)/'
    [ -n "$tmp" ] && [ "$(wc -c < "$src")" -gt 10485760 ] && echo "$(basename "$src"): over 10 MB; the directory takes 10 MB at most"
    find "$dir" -path "$dir/.git" -prune -o -name '*.phar' -print 2>/dev/null | sed "s|^$dir/||;s/$/: .phar archive in the package: ship readable source/"
    find "$dir" -path "$dir/.git" -prune -o -path '*/node_modules' -prune -o -name block.json -print 2>/dev/null | while IFS= read -r f; do
      grep -Eq '"name"[[:space:]]*:[[:space:]]*"(core|wordpress)/' "$f" && echo "${f#"$dir"/}: block name uses the reserved core/ or wordpress/ namespace"
    done
    # G13: copies of libraries WordPress already ships.
    find "$dir" -path "$dir/.git" -prune -o -path '*/node_modules' -prune -o -type f \( -iname 'jquery.js' -o -iname 'jquery.min.js' -o -iname 'jquery-[0-9]*.js' -o -iname 'jquery-ui*.js' \
      -o -iname 'jquery-migrate*.js' -o -iname 'react.production*.js' -o -iname 'react-dom*.js' -o -iname 'lodash*.js' -o -iname 'underscore*.js' -o -iname 'backbone*.js' \
      -o -iname 'moment.js' -o -iname 'moment.min.js' -o -iname 'masonry*.js' -o -iname 'imagesloaded*.js' -o -iname 'hoverIntent*.js' -o -iname 'PHPMailer.php' \
      -o -iname 'SimplePie.php' -o -iname 'class-phpass.php' -o -iname 'PasswordHash.php' -o -iname 'pclzip*.php' -o -iname 'getid3.php' \) -print 2>/dev/null \
      | sed "s|^$dir/||" | sort | sed 's/$/: G13: WordPress ships this library: enqueue or use the core copy instead of bundling it/'
    # Bundled Composer libraries: list them with versions, flag core duplicates and non-GPL licenses; with Composer and a lock file, ask which are behind.
    if [ -f "$dir/vendor/composer/installed.json" ]; then
      libs=$(tr -d '\r' < "$dir/vendor/composer/installed.json" | awk '
        /"name"[ \t]*:[ \t]*"[^"]*\/[^"]*"/ { n = $0; sub(/.*"name"[ \t]*:[ \t]*"/, "", n); sub(/".*/, "", n); v = ""; lic = "" }
        /"version"[ \t]*:/ && n != "" && v == "" { v = $0; sub(/.*"version"[ \t]*:[ \t]*"/, "", v); sub(/".*/, "", v) }
        /"license"[ \t]*:/ && n != "" { inl = 1 }
        inl { s = $0; sub(/.*"license"[ \t]*:/, "", s); while (match(s, /"[A-Za-z0-9.+ -]+"/)) { t = substr(s, RSTART + 1, RLENGTH - 2); s = substr(s, RSTART + RLENGTH); if (t != "license") lic = lic (lic == "" ? "" : "/") t } if ($0 ~ /\]/) { inl = 0; printf "%s\t%s\t%s\n", n, v, lic; n = "" } }')
      printf '%s\n' "$libs" | awk -F'\t' 'NF { printf "%s%s %s", (c++ ? ", " : "vendor: bundled "), $1, $2 } END { if (c) print ". Each must be the latest stable release (composer outdated --direct)" }'
      printf '%s\n' "$libs" | awk -F'\t' -v ok="$GPL_OK" 'NF && (toupper($3) !~ toupper(ok) || $3 ~ /proprietary/) { printf "vendor/%s: G1: license %s is not GPL-compatible\n", $1, ($3 == "" ? "(none declared)" : $3) }'
      printf '%s\n' "$libs" | awk -F'\t' '$1 ~ /^(phpmailer\/phpmailer|simplepie\/simplepie|rmccue\/requests|paragonie\/sodium_compat|paragonie\/random_compat|james-heinrich\/getid3)$/ { printf "vendor/%s: G13: WordPress ships this library: use the core copy\n", $1 }'
    fi
    if [ -f "$dir/composer.lock" ] && command -v composer >/dev/null 2>&1; then
      (cd "$dir" && composer outdated --locked --direct --no-dev --no-interaction 2>/dev/null) | grep -E '^[a-z0-9_.-]+/' | sed 's/^/outdated library: /'
    fi
  )
  [ -n "$tmp" ] && rm -rf "$tmp"
  [ -n "$out" ] && printf '%s\n' "$out"
  echo "WPORG AUDIT: $(printf '%s' "$out" | grep -c .) finding(s) in $(printf '%s\n' "$files" | grep -c .) file(s). Heuristic: run it on the release zip, read each line. Rules and fixes: skills/lean-gate/WORDPRESS.md, WordPress.org review."
  return 0
}
