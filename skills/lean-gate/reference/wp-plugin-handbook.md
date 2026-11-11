# WordPress Plugin Handbook: rules

Every page of the WordPress Plugin Developer Handbook (102 pages, https://developer.wordpress.org/plugins/) and the Common APIs Handbook security and filesystem pages, distilled into rules in our own words on 2026-11-11 (detailed guidelines last updated 2026-03-11). Each section names its source pages: when a rule matters, check the live page, which wins over this file.

Read the contents table, then only the section the task needs. `lean-gate audit wporg <plugin dir or release zip>` checks most "Machine-checkable" lines automatically; WORDPRESS.md, section 7, maps each guideline to its check.

<!-- toc -->
- 54-59: Plugin Handbook home and Introduction
- 60-78: Plugin Basics: layout, headers, loading
- 79-88: Plugin Basics: Activation and Deactivation
- 89-97: Plugin Basics: Uninstall
- 98-110: Plugin Basics: Best Practices
- 111-125: Hooks (overview, actions, filters, advanced, custom hooks)
- 126-138: Cron
- 139-153: Administration Menus
- 154-170: Creating Tables
- 171-183: HTTP API
- 184-205: Internationalization
- 206-229: JavaScript: enqueuing, jQuery, Ajax, Heartbeat
- 230-244: Metadata (post meta and meta boxes)
- 245-257: Custom Post Types
- 258-277: Privacy
- 278-299: REST API: overview and routes/endpoints
- 300-309: REST API: requests
- 310-318: REST API: responses
- 319-333: REST API: schema and controller classes
- 334-340: Developer Tools
- 341-394: Machine-checkable (part 1: plugin development)
- 395-467: Security (Common APIs Handbook: overview, vulnerabilities, validation, sanitizing, escaping, nonces, capabilities, example)
- 468-482: Settings (Options API, Settings API, custom settings page)
- 483-494: Shortcodes
- 495-503: Taxonomies
- 504-521: Users (roles, capabilities, user meta, user functions)
- 522-528: WordPress.org Plugin Directory: overview and requirements
- 529-565: Detailed Plugin Guidelines (18 guidelines)
- 566-631: Common issues (Plugin Review Team)
- 632-645: Block Directory and block-specific guidelines
- 646-655: Alerts and warnings, automated security review
- 656-669: Subversion
- 670-687: readme.txt
- 688-695: Planning, submitting, maintaining
- 696-704: Plugin assets
- 705-711: Previews and blueprints
- 712-716: Release confirmation emails
- 717-722: Reporting plugin security issues
- 723-728: Special roles
- 729-736: Take over and transfer
- 737-743: Forums
- 744-786: Developer FAQ
- 787-793: MCP server
- 794-843: Machine-checkable (part 2: security, settings, users, WordPress.org)
<!-- /toc -->

## Plugin Handbook home and Introduction
Source: https://developer.wordpress.org/plugins/ (sub-pages: /intro/, /intro/what-is-a-plugin/, /credits/)
- Never edit WordPress core files; every change in behaviour goes in a plugin (core is overwritten on update).
- A plugin needs only one main PHP file with a header comment, a few prefixed functions and hooks; add complexity only when size demands it.
- Credits page is a contributor list with no rules (nothing to apply).

## Plugin Basics: layout, headers, loading
Source: https://developer.wordpress.org/plugins/plugin-basics/ (sub-pages: /header-requirements/, /including-a-software-license/, /determining-plugin-and-content-directories/)
- Put the plugin in its own folder named after the slug, with the main file named plugin-slug.php.
- Exactly one PHP file in the plugin may carry the plugin header comment; all other files must not.
- The header must contain at least "Plugin Name:"; for WordPress.org also set Version, Requires at least, Requires PHP, Author, License, License URI, Text Domain.
- Description header: keep it under 140 characters.
- Plugin URI must be unique to the plugin and must not be a WordPress.org URL.
- License header takes a short slug such as "GPLv2 or later"; pick a license compatible with GPLv2+ (WordPress.org requires it).
- Text Domain header must equal the plugin slug; Domain Path starts with a slash (e.g. /languages).
- Network header can only be "true" (plugin activatable network-wide only); omit it otherwise.
- Update URI stops a same-named WordPress.org plugin from overwriting a third-party plugin; Requires Plugins takes comma-separated WordPress.org slugs only (no "dir/file.php" form, no commas in slugs).
- WordPress compares versions with PHP version_compare(), so "1.02" is greater than "1.1"; make each release version compare greater than the previous one.
- Add a GPL license block comment under the header in the main file (encouraged).
- Build file URLs with plugins_url( 'file', __FILE__ ), plugin_dir_url(), plugin_dir_path(), plugin_basename(); never hard-code wp-content, wp-content/plugins or uploads paths (users can move or rename them).
- Use admin_url(), site_url(), home_url(), content_url(), includes_url(), wp_upload_dir() (returns an array) for other locations; on multisite use get_admin_url(), get_site_url(), network_admin_url() and friends.
- Do not use WP_CONTENT_DIR, WP_CONTENT_URL, WP_PLUGIN_DIR, WP_PLUGIN_URL directly (listed for reference only); symlinks make __FILE__-derived paths differ from hard-coded ones.
- Load plugin assets only through wp_enqueue_script() and wp_enqueue_style() with a URL from plugins_url().
- Use the three basic lifecycle hooks: register_activation_hook, register_deactivation_hook, register_uninstall_hook (or uninstall.php).

## Plugin Basics: Activation and Deactivation
Source: https://developer.wordpress.org/plugins/plugin-basics/activation-deactivation-hooks/
- Call register_activation_hook( __FILE__, 'prefix_fn' ) and register_deactivation_hook( __FILE__, 'prefix_fn' ) with the path of the MAIN plugin file (the one with the header); if called from another file, still pass the main file path.
- Activation: add rewrite rules, create custom tables, set default options.
- Deactivation: remove only temporary data (caches, temp files, scheduled events, rewrite rules); never delete user data or options here.
- When a plugin registers a CPT, call the CPT registration function inside the activation callback, then flush_rewrite_rules(), to avoid 404s.
- On deactivation call unregister_post_type( 'slug' ) then flush_rewrite_rules() to drop the rules.
- Never call flush_rewrite_rules() on every request (init); only in activation/deactivation.
- Activation hooks do not fire on plugin update (since WP 3.1); run upgrade routines from plugins_loaded comparing a stored version option.

## Plugin Basics: Uninstall
Source: https://developer.wordpress.org/plugins/plugin-basics/uninstall-methods/
- Deleting data (options, custom tables, post meta, transients) belongs in uninstall, never in the deactivation hook.
- Use either register_uninstall_hook( __FILE__, 'prefix_fn' ) or an uninstall.php in the plugin root (the root file is run automatically on deletion from Plugins screen).
- First line of uninstall.php: if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) { exit/die; }.
- WP_UNINSTALL_PLUGIN is NOT defined when the uninstall callback runs via register_uninstall_hook; do not rely on it there.
- Use delete_option() and, for multisite, delete_site_option(); drop tables with $wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}name" ).
- Looping over every site on multisite to clean up is expensive; keep it batched or minimal.

## Plugin Basics: Best Practices
Source: https://developer.wordpress.org/plugins/plugin-basics/best-practices/
- Prefix every globally visible name: functions, classes, interfaces, traits, namespaces, global variables, constants, options, transients, hooks, post types, meta keys.
- Prefix must be at least 4 characters (5 recommended), unique to the plugin, and not a common English word.
- Never use reserved prefixes: wp_, _ (single underscore), __ (double underscore), WordPress; also avoid host-product prefixes for add-ons (e.g. Woo, WooCommerce) as stand-alone names.
- Namespaced code or classes avoid function and class prefixing, but the namespace itself, the class names at global scope, options and transients still need unique prefixes.
- Do not wrap everything in function_exists()/class_exists() to dodge collisions: a same-named earlier definition still breaks the plugin; use that pattern only for shared libraries.
- Use defined(), function_exists(), class_exists(), isset() to test for existence of constants, functions, classes, variables.
- Keep the plugin root to the main file and optional uninstall.php; put everything else in subfolders (includes, admin, public, languages, js/css/images).
- Separate admin code with is_admin() and require_once __DIR__ . '/admin/...'; is_admin() does not prove the user is privileged, so still check capabilities.
- Every file that executes code outside class/function definitions (e.g. main file) must begin with: if ( ! defined( 'ABSPATH' ) ) { exit; }.
- Small plugins do not need class architecture; large ones should start with classes and separate assets/build files.

## Hooks (overview, actions, filters, advanced, custom hooks)
Source: https://developer.wordpress.org/plugins/hooks/ (sub-pages: /hooks/actions/, /hooks/filters/, /hooks/advanced-topics/, /hooks/custom-hooks/)
- Actions run code at a point and return nothing; filters receive a value, modify it and MUST return it.
- Filter callbacks must be side-effect free: no echo, no output, no global changes.
- add_action/add_filter( $hook_name, $callback, $priority = 10, $accepted_args = 1 ); lower priority runs first; equal priority runs in registration order.
- To receive more than one argument pass the 4th param (e.g. add_action( 'save_post', 'fn', 10, 2 ) for $post_id, $post) and declare those params in the callback.
- Name callback parameters like the hook's parameters.
- remove_action/remove_filter must use identical hook, callback and priority as the original add, and must run AFTER the original was added (e.g. on after_setup_theme or later).
- remove_all_actions()/remove_all_filters() strip every callback on a hook; use sparingly because it breaks other plugins.
- Use current_action()/current_filter() when one callback serves several hooks; did_action( 'hook' ) to guard against running twice.
- The "all" hook fires on every hook; for debugging only, never ship it.
- Expose your own extension points with do_action() and apply_filters(); wrap user-facing text and CPT/args arrays in apply_filters().
- Custom hook names must be prefixed uniquely (e.g. myplugin_before_render); generic names like email_body collide.
- Custom action callbacks return nothing; custom filters return the (possibly modified) value.

## Cron
Source: https://developer.wordpress.org/plugins/cron/ (sub-pages: /cron/scheduling-wp-cron-events/, /cron/understanding-wp-cron-scheduling/, /cron/hooking-wp-cron-into-the-system-task-scheduler/, /cron/simple-testing/)
- WP-Cron fires only on page load, so timing is approximate; a task is never lost, only delayed.
- Create a custom hook and attach the worker with add_action( 'prefix_cron_hook', 'prefix_cron_exec' ); without it the event never runs.
- wp_schedule_event( $timestamp, $recurrence, $hook, $args ) schedules a duplicate each call; guard with if ( ! wp_next_scheduled( 'hook' ) ) (returns timestamp or false).
- Default recurrences: hourly, twicedaily, daily, weekly (weekly since WP 5.4); add custom ones through the cron_schedules filter returning array( 'interval' => seconds, 'display' => text ), keyed by a prefixed name.
- All intervals are in seconds; schedule keys must be prefixed.
- Unschedule on deactivation: $ts = wp_next_scheduled( 'hook' ); wp_unschedule_event( $ts, 'hook' ) (also unschedules future occurrences); or wp_clear_scheduled_hook( 'hook' ) to clear all.
- Orphaned cron events keep firing after deactivation or deletion; always clean them up in register_deactivation_hook.
- Event args must be identical in wp_next_scheduled/wp_unschedule_event as when scheduled.
- Never assume system-cron timing; to make cron exact, site owner sets DISABLE_WP_CRON true in wp-config.php and calls wp-cron.php from a system scheduler (do not define it from a plugin).
- Test with wp cron event list / wp cron event run, _get_cron_array(), wp_get_schedules().

## Administration Menus
Source: https://developer.wordpress.org/plugins/administration-menus/ (sub-pages: /sub-menus/, /top-level-menus/)
- Register menus on the admin_menu action only.
- A plugin with a single settings page should be a sub-menu of an existing menu (Settings or Tools) via add_options_page(), add_management_page(), or add_submenu_page( $parent_slug, $page_title, $menu_title, $capability, $menu_slug, $callback ).
- Parent helpers: add_dashboard_page, add_posts_page, add_media_page, add_pages_page, add_comments_page, add_theme_page, add_plugins_page, add_users_page, add_management_page (tools.php), add_options_page (options-general.php).
- Top-level: add_menu_page( $page_title, $menu_title, $capability, $menu_slug, $callback, $icon_url, $position ); do not use a file path as $menu_slug with a null callback (legacy), pass a callback that includes the view.
- Always set a real $capability (e.g. manage_options) and re-check current_user_can() inside the page callback before rendering.
- Page markup: wrap in <div class="wrap">, heading with esc_html( get_admin_page_title() ).
- Prefer the Settings API on the page: settings_fields( 'group' ), do_settings_sections( 'page' ), submit_button().
- remove_menu_page( $slug ) only hides the menu (users can still open the URL); never use it as access control; call it late (priority 99 on admin_menu).
- add_menu_page/add_submenu_page return a hookname; hook 'load-' . $hookname to process form submissions before output (the page callback runs too late for redirects/headers).
- The load-{hook} callback fires on every page view; in it check $_SERVER['REQUEST_METHOD'] === 'POST', verify nonce, validate, sanitize.
- Form action for a manual form: menu_page_url( 'slug' ), which escapes and echoes by default.
- remove_menu_page and remove_submenu_page act on slugs; use unique, prefixed menu slugs.

## Creating Tables
Source: https://developer.wordpress.org/plugins/creating-tables-with-plugins/
- Prefer post meta/options over a custom table when practical; create a table only for real structured data.
- Table name: $wpdb->prefix . 'myplugin_name' (never hard-code "wp_"); keep the plugin prefix in the name.
- Create tables in a function run by register_activation_hook, and run upgrades via a stored version option checked on plugins_loaded (activation does not run on update).
- Use dbDelta( $sql ) after require_once ABSPATH . 'wp-admin/includes/upgrade.php' (not loaded by default).
- Use $charset_collate = $wpdb->get_charset_collate(); and append it to the CREATE TABLE statement (else characters can turn into ?).
- dbDelta quirk: each column on its own line.
- dbDelta quirk: write "PRIMARY KEY  (id)" with TWO spaces between PRIMARY KEY and the opening parenthesis.
- dbDelta quirk: use KEY, not INDEX; at least one KEY required; format "KEY name (column)" with a single space after KEY.
- dbDelta quirk: no backticks or apostrophes around column names.
- dbDelta quirk: column types lowercase; SQL keywords (CREATE TABLE, NOT NULL, DEFAULT) uppercase; give lengths where a length is accepted, e.g. int(11).
- dbDelta also alters existing tables, so it serves for upgrades; give the full CREATE TABLE statement each time.
- Store a schema version with add_option( 'prefix_db_version', $v ); compare with get_option on plugins_loaded, call the installer and update_option when it differs.
- Insert with $wpdb->insert() (escapes automatically); for $wpdb->query/get_results/get_var with variables always use $wpdb->prepare().
- Drop custom tables on uninstall, not on deactivation.

## HTTP API
Source: https://developer.wordpress.org/plugins/http-api/
- Use wp_remote_get, wp_remote_post, wp_remote_head, wp_remote_request( $url, $args ); never raw cURL, file_get_contents on URLs, or other PHP HTTP stacks.
- Defaults: method GET, timeout 5 seconds, redirection 5, httpversion 1.0, blocking true; override through $args (set a sane timeout, blocking false for fire-and-forget).
- Always check the result: is_wp_error( $response ) first, then wp_remote_retrieve_response_code( $response ) against 200 before using data.
- Read data with wp_remote_retrieve_body(), wp_remote_retrieve_header( $r, 'name' ), wp_remote_retrieve_headers().
- POST data goes in $args['body'] as an array (appears in $_POST on the server); other methods via wp_remote_request with 'method'.
- Basic auth goes in $args['headers']['Authorization'] = 'Basic ' . base64_encode(...); never hard-code credentials in source.
- Cache remote API responses with set_transient( 'prefix_key', $value, HOUR_IN_SECONDS ) / get_transient() / delete_transient(); get_transient returns false on miss or expiry, so refetch then.
- Do not cache real-time data or when the API headers forbid caching; respect rate limit headers (x-ratelimit-*), cache-control.
- Prefix transient names; store only the body/data, not entire response objects.
- Do not make remote requests on every page load; cache them or run them in cron/AJAX.

## Internationalization
Source: https://developer.wordpress.org/plugins/internationalization/ (sub-pages: /how-to-internationalize-your-plugin/, /localization/, /security/)
- Wrap every user-facing string in a gettext function with the plugin text domain as the LAST argument: __(), _e(), _x(), _ex(), _n(), _nx(), esc_html__(), esc_html_e(), esc_attr__(), esc_attr_e(), esc_html_x(), esc_attr_x().
- The text domain must equal the plugin slug (lowercase, dashes, no underscores, no spaces) and match the Text Domain header.
- The text domain must be a literal string; never a variable or constant (extraction tools cannot read it).
- Never concatenate or interpolate variables into translatable strings; use placeholders and printf/sprintf: printf( __( 'Hello %s', 'slug' ), $name ).
- Wrong: _e( "Your city is $city.", 'slug' ). Right: sprintf( __( 'Your city is %s.', 'slug' ), $city ).
- Several placeholders: use numbered ones (%1$s, %2$s) in single-quoted strings so translators can reorder; add a /* translators: 1: ..., 2: ... */ comment as the last comment right before the call.
- Plurals: _n( '%s item', '%s items', $count, 'slug' ) with number_format_i18n( $count ); do not hard-code "One item"; use _n_noop() + translate_nooped_plural() for deferred plurals.
- Use _x()/_ex() with a context argument to disambiguate identical words (noun vs verb).
- Never translate an empty string; never leave leading/trailing whitespace inside a translatable string; avoid \r, use \n.
- Translate whole sentences, not words; do not split sentences across calls; keep markup and URLs out of strings.
- Even strings that exist in core ('Settings') need your own text domain.
- Dates and numbers: date_i18n(), number_format_i18n().
- Loading: for WordPress.org-hosted plugins requiring WP 4.6+ translations come from translate.wordpress.org and load_plugin_textdomain() is not required; otherwise call load_plugin_textdomain( 'slug', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' ) on init.
- Domain Path header can be omitted for plugins hosted on WordPress.org; keep /languages for self-hosted.
- Escape translated output: esc_html__(), esc_html_e(), esc_attr__() (translators can inject script).
- Never put URLs or markup that translators could swap inside translated strings; pass them as printf placeholders (e.g. '<a href="...">' as %1$s argument).
- Generate the POT with wp i18n make-pot; compile .mo yourself with msgfmt -cv -o out.mo in.po and discard translator-supplied .mo files.
- Translation file names: slug-locale.mo/.po (e.g. my-plugin-de_DE.mo).
- JavaScript strings are translated with wp_set_script_translations(); keep strings in JS wrapped with __() from wp.i18n.

## JavaScript: enqueuing, jQuery, Ajax, Heartbeat
Source: https://developer.wordpress.org/plugins/javascript/ (sub-pages: /javascript/enqueuing/, /javascript/ajax/, /javascript/jquery/, /javascript/heartbeat-api/, /javascript/summary/)
- Register scripts with wp_register_script/wp_enqueue_script( $handle, $src, $deps, $ver, $args ) from a hook: admin_enqueue_scripts (admin), wp_enqueue_scripts (front), login_enqueue_scripts (login); never print <script> tags or enqueue at file load.
- $src comes from plugins_url(); list 'jquery' (or other handles) in $deps; always pass a version string.
- $args (WP 6.3+) is an array: 'in_footer' => true and/or 'strategy' => 'defer' or 'async'; legacy boolean fifth argument still works.
- Styles use wp_enqueue_style / wp_register_style on the same hooks.
- admin_enqueue_scripts passes $hook_suffix: compare it (or get_current_screen()) and enqueue only on your own pages; front end: gate with is_single(), is_home(), etc.
- Use named callbacks, not closures, when supporting very old PHP.
- Pass PHP data to JS with wp_localize_script( $handle, 'prefix_obj', array( 'ajax_url' => admin_url( 'admin-ajax.php' ), 'nonce' => wp_create_nonce( 'action' ) ) ), after the script is registered/enqueued with that handle.
- All AJAX requests go to admin-ajax.php (or REST); never include wp-load.php in a plugin file or POST to your own plugin file.
- AJAX request data must include an 'action' key and a nonce (default key _ajax_nonce) for state-changing calls.
- Server handlers: add_action( 'wp_ajax_{action}', 'cb' ) for logged-in users and add_action( 'wp_ajax_nopriv_{action}', 'cb' ) for logged-out; register nopriv only when guests really need it.
- Handler order: check_ajax_referer( 'action' ), then current_user_can(), then unslash/sanitize input, then act, then respond.
- Respond with wp_send_json(), wp_send_json_success(), wp_send_json_error() (they die); for other output end with wp_die().
- Read input from $_POST/$_GET/$_COOKIE specifically; do not use $_REQUEST (cookie values override form values).
- Run wp_unslash() on superglobal input before sanitizing; sanitize every value (sanitize_text_field, absint, etc.).
- Escape any HTML echoed back from the handler (esc_html, wp_kses_post).
- WordPress nonces are valid about 12-24 hours and reusable, not true one-time tokens; add capability checks regardless.
- Only print/localize a nonce on pages where the user is allowed to use it.
- Do not parse JSON with eval(); use JSON.parse. Admin pages get a global ajaxurl; front end must localize its own URL.
- Heartbeat: add data via the JS heartbeat-send event, respond with the heartbeat_received filter ( $response, $data ), read the reply in the heartbeat-tick event; prefix custom keys; return $response unchanged when your key is absent.
- Wrap jQuery code with jQuery( document ).ready( function( $ ) { ... } ) because WordPress loads jQuery in no-conflict mode (the $ global is not defined).
- Example code in the docs omits sanitization, security, errors and i18n; production code must add them.

## Metadata (post meta and meta boxes)
Source: https://developer.wordpress.org/plugins/metadata/ (sub-pages: /metadata/managing-post-metadata/, /metadata/custom-meta-boxes/, /metadata/rendering-post-metadata/)
- Use add_post_meta( $id, $key, $value, $unique ), update_post_meta( $id, $key, $value, $prev_value ), delete_post_meta( $id, $key, $value ), get_post_meta( $id, $key, $single ).
- Prefix meta keys with the plugin prefix; start the key with an underscore (_prefix_key) to hide it from the Custom Fields box and the_meta().
- Array values are serialized automatically and are never shown in the Custom Fields UI.
- update_post_meta creates the key if missing; use the unique flag when only one value per key should exist.
- Meta values pass through stripslashes(): when storing JSON or backslash-containing strings wrap with wp_slash() (WP 3.6+) or the data corrupts.
- Add meta boxes with add_meta_box( $id, $title, $callback, $screen ) on the add_meta_boxes action; remove_meta_box() needs the exact same id/screen/context.
- Meta boxes have no submit button; their fields post with the main edit form.
- Save on save_post (fires multiple times, incl. autosaves and revisions): bail on DOING_AUTOSAVE, wp_is_post_revision(), verify a nonce (wp_nonce_field in the box, wp_verify_nonce on save), and check current_user_can( 'edit_post', $post_id ).
- Check array_key_exists/isset on $_POST keys, unslash and sanitize before update_post_meta; the docs sample that stores raw $_POST is unsafe.
- Use selected()/checked() helpers when rendering saved values; escape all output (esc_attr, esc_html).
- Boxes that make AJAX calls from the edit screen must enqueue on admin_enqueue_scripts only for the relevant post types, localize admin_url( 'admin-ajax.php' ) (or use ajaxurl), and the handler must check nonce and current_user_can( 'edit_post', $post_id ).
- OOP meta boxes: register [ Class::class, 'method' ] callables on add_meta_boxes and save_post.

## Custom Post Types
Source: https://developer.wordpress.org/plugins/post-types/ (sub-pages: /post-types/registering-custom-post-types/, /post-types/working-with-custom-post-types/)
- Register with register_post_type( $post_type, $args ) on the init action (must be after after_setup_theme and before admin_init).
- Post type key: max 20 characters (VARCHAR(20)), lowercase, prefixed with a short unique plugin prefix; never start with wp_; avoid generic keys like "product".
- Duplicate post type keys cannot be resolved without disabling one plugin; slugs can (change 'rewrite' => array( 'slug' => ... )).
- Provide 'labels' (name, singular_name) with translation functions, 'public', and 'has_archive' as needed.
- Set a specific rewrite slug (not generic like "products"); expose args through an apply_filters() call so others can override.
- Put CPTs in a plugin, not a theme, so content survives theme switches.
- After registering or changing a CPT's rewrite rules, flush rewrite rules once on activation (and deactivation), not on every request.
- Templates: single-{post_type}.php and archive-{post_type}.php; is_post_type_archive() and post_type_archive_title() work in any template.
- Query with WP_Query( array( 'post_type' => 'slug', 'posts_per_page' => n ) ).
- CPTs are not added to the main query automatically; use pre_get_posts and guard with $query->is_main_query() and not is_admin() before $query->set( 'post_type', array(...) ).

## Privacy
Source: https://developer.wordpress.org/plugins/privacy/ (sub-pages: /privacy/adding-the-personal-data-exporter-to-your-plugin/, /privacy/adding-the-personal-data-eraser-to-your-plugin/, /privacy/privacy-related-options-hooks-and-capabilities/, /privacy/suggesting-text-for-the-site-privacy-policy/)
- Collect only needed personal data, default to privacy-preserving settings, require opt-in for sharing, and delete data no longer needed.
- Any plugin that collects, stores, or sends personal data must register an exporter and an eraser and supply privacy policy text.
- Disclose third-party sharing (APIs, SDKs, tracking pixels, third-party JS/iframes), telemetry, cookies/local storage, and logging of personal data.
- Use wp_privacy_anonymize_data() when logging; avoid logging IPs/emails; define log retention.
- Clean up personal data on uninstall, when a related post is deleted, and when a user is deleted.
- Check the capabilities guarding personal data in admin and REST output; never expose personal data in REST or front end without a capability check.
- Exporter: add_filter( 'wp_privacy_personal_data_exporters', fn ); add $exporters['unique-slug'] = array( 'exporter_friendly_name' => ..., 'callback' => ... ); return the array.
- Exporter callback signature: ( string $email_address, int $page = 1 ) returning array( 'data' => $items, 'done' => bool ).
- Each export item: array( 'group_id', 'group_label' (optional, translated), 'item_id' (e.g. comment-133, unique), 'data' => array( array( 'name' => ..., 'value' => ... ), ... ) ).
- Paginate: process a bounded batch per page (e.g. 100 to 500); 'done' is true only when no more pages remain, i.e. count( $batch ) < $number (the handbook's exporter sample compares with > which is wrong).
- Eraser: add_filter( 'wp_privacy_personal_data_erasers', fn ); same registration shape with 'eraser_friendly_name' and 'callback'.
- Eraser callback ( string $email_address, int $page = 1 ) returns array( 'items_removed' => bool, 'items_retained' => bool, 'messages' => array(), 'done' => bool ); explain retained data in 'messages'.
- Erasers anonymize or delete only the data keyed to that email; they never delete the user account.
- Policy text: call wp_add_privacy_policy_content( $plugin_name, $policy_text ) on the admin_init action (never outside a hook) after checking function_exists().
- Policy text should answer: what is collected and why, who it is shared with, retention, user rights, where it is sent; wrap helper text in class "privacy-policy-tutorial" to exclude it from the copy button; sanitize with wp_kses_post( wpautop( $content, false ) ).
- Privacy capabilities: erase_others_personal_data, export_others_personal_data, manage_privacy_options; privacy page ID is option wp_page_for_privacy_policy.
- Export files are kept 3 days (filter wp_privacy_export_expiration); do not change wp_privacy_personal_data_email_to without strong reason.

## REST API: overview and routes/endpoints
Source: https://developer.wordpress.org/plugins/rest-api/ (sub-pages: /rest-api/rest-api-overview/, /rest-api/routes-endpoints/)
- Register routes with register_rest_route( $namespace, $route, $args, $override = false ) on the rest_api_init action only.
- Namespace format "vendor/v1" (unique vendor + version); never use the "wp" namespace (core-only); bump the version for breaking changes.
- Namespace string should not start or end with a slash; the route starts with a slash; each resource path is unique within the namespace.
- Methods: use constants WP_REST_Server::READABLE (GET), CREATABLE (POST), EDITABLE (POST/PUT/PATCH), DELETABLE (DELETE), ALLMETHODS.
- Multiple endpoints per route: pass an array of endpoint arrays (one per method set).
- Required key: 'permission_callback' (singular; the handbook text shows "permissions_callback" which is wrong and ignored). Omitting it triggers _doing_it_wrong since WP 5.5.
- For genuinely public endpoints set 'permission_callback' => '__return_true' explicitly; for private data return current_user_can( 'capability' ) or a WP_Error.
- Return false or WP_Error( 'rest_forbidden', msg, array( 'status' => rest_authorization_required_code() ) ) (401 if logged out, 403 if logged in) from permission callbacks.
- Permission callbacks run before the main callback and receive the WP_REST_Request.
- The main 'callback' receives WP_REST_Request $request; return data via rest_ensure_response() (or a WP_REST_Response) or a WP_Error.
- Path variables use named regex groups: '/products/(?P<id>[\d]+)'; the pattern restricts input but still validate existence; cast with (int) $request['id'].
- Return WP_Error( 'prefix_code', esc_html__( 'message', 'slug' ), array( 'status' => 404 ) ) for failures; use correct HTTP statuses (400 bad input, 401/403 auth, 404 missing).
- Method semantics: GET read-only no side effects; POST create (not idempotent); PUT update; DELETE delete and return the deleted resource; GET/HEAD/PUT/DELETE must be idempotent.
- Clients without PUT/DELETE can use POST with ?_method=DELETE or the X-HTTP-Method-Override header.
- Declare 'args' per parameter with 'type', 'description', 'required', 'default', 'enum', 'validate_callback' and 'sanitize_callback'.
- Validation runs before sanitization (WP 4.6+); validate_callback( $value, $request, $param ) returns true/false or WP_Error; sanitize_callback( $value, $request, $param ) returns the cleaned value.
- A restrictive 'enum'/'type' (with rest_validate_request_arg as validate_callback) can replace a custom validator; free-text args need a sanitize_callback such as sanitize_text_field.
- Escape or sanitize any data returned to clients that came from users; REST output is not auto-escaped for HTML contexts.
- Do not bypass endpoint capability checks with wp_ajax-style assumptions; REST authentication by cookie requires the X-WP-Nonce (wp_rest) header from JS.

## REST API: requests
Source: https://developer.wordpress.org/plugins/rest-api/requests/
- Read input only through the WP_REST_Request object ($request['param'], get_param(), get_json_params(), get_file_params()); never touch $_GET, $_POST, $_FILES, $_SERVER inside endpoints.
- Parameter types: URL (route path variables), query, body, file (multipart/form-data); do not put body parameters on GET requests.
- File uploads come from $request->get_file_params(); store them with wp_handle_upload(), never with raw move_uploaded_file.
- Keep path variables few; they slow route matching; prefer query/body args.
- $request->get_attributes() returns the registered options (args, callbacks) for the matched endpoint; use it inside validation callbacks.
- Make internal calls with rest_do_request( new WP_REST_Request( 'GET', '/ns/v1/route' ) ) and $request->set_param(); the response stays a PHP object (not JSON encoded); permission callbacks still run.
- Whitelist batch/internal request methods and routes; validate every sub-request and do not let callers reach arbitrary routes.

## REST API: responses
Source: https://developer.wordpress.org/plugins/rest-api/responses-2/
- Return WP_REST_Response objects (or data wrapped by rest_ensure_response()), or WP_Error; the server converts WP_Error into an HTTP response with the 'status' from its data array.
- Set status and headers via $response->set_status(), ->header(); read via get_data(), get_status(), get_headers().
- Add hypermedia links with $response->add_links( array( 'rel' => array( 'href' => ..., 'embeddable' => true ) ) ); the "up" rel has HAL meaning (parent).
- Clients request linked resources inline with ?_embed.
- Build link URLs with rest_url( 'ns/v1/route' ) and add_query_arg().
- Only return fields the requesting user may see; honor the 'context' (view, edit, embed) in schema when exposing sensitive fields.

## REST API: schema and controller classes
Source: https://developer.wordpress.org/plugins/rest-api/schema/ (sub-page: /rest-api/controller-classes/)
- Provide a resource schema through the route's 'schema' key (a callable returning a JSON Schema array); it is served on OPTIONS requests and the API index.
- Schema array: '$schema' => 'http://json-schema.org/draft-04/schema#', 'title' => resource name, 'type' => 'object', 'properties' => array( field => array( 'description', 'type', 'context' => array( 'view', 'edit', 'embed' ), 'readonly' ) ).
- Build responses so fields match the schema; prepare data in a prepare_item_for_response() method and include only fields present in the schema (honors _fields).
- Argument schema (type, enum, required, format, minimum, maximum) doubles as validation; reuse generic validate/sanitize callbacks keyed on the registered type.
- 'required' => true makes WordPress reject requests missing the argument before your callback runs.
- Prefer a controller class (ideally extending WP_REST_Controller) with register_routes(), get_items, get_item, *_permissions_check, prepare_item_for_response, prepare_response_for_collection, get_item_schema.
- Instantiate the controller and call register_routes() from a function hooked on rest_api_init.
- Do not subclass one concrete controller to support another resource (e.g. posts controller to CPT controller); use an abstract base or separate classes.
- Declare route namespace once as a controller property ('vendor/v1') and compute the resource base from it.
- Add authorization_status_code logic: 401 when not logged in, 403 when logged in but lacking the capability (same as rest_authorization_required_code()).
- Bug in the handbook sample: it calls prepare_item_for_response() without $this-> and passes one argument; always call $this->prepare_item_for_response( $post, $request ).
- Wrap controller classes (or namespaces) with the plugin prefix so generic method names (get_items) never collide in the global scope.

## Developer Tools
Source: https://developer.wordpress.org/plugins/developer-tools/ (sub-pages: /developer-tools/debug-bar-and-add-ons/, /developer-tools/helper-plugins/)
- Run Plugin Check against the plugin before submitting to WordPress.org; fix its errors and warnings (i18n, security, performance, accessibility).
- Develop with WP_DEBUG on (and SAVEQUERIES when profiling) and fix every PHP warning and notice.
- Use Query Monitor and Debug Bar add-ons (Cron, Transients, Remote Requests, Actions and Filters, Constants) to inspect queries, hooks, HTTP calls and scheduled events.
- Ship none of these debug tools or their code in the plugin.

## Machine-checkable (part 1: plugin development)
- Direct file access guard missing in a PHP file that runs code at top level | file *.php (not only class/function declarations) lacks `defined\(\s*'ABSPATH'\s*\)` | Plugin Basics: Best Practices
- Main plugin file has no header | main file lacks `^\s*\*?\s*Plugin Name:` | Plugin Basics: layout, headers, loading
- Plugin URI points to WordPress.org | `Plugin URI:.*wordpress\.org` | Plugin Basics: layout, headers, loading
- Description header too long | `Description:\s*.{141,}` | Plugin Basics: layout, headers, loading
- More than one file with a plugin header | `Plugin Name:` matches in more than one *.php at plugin root/subfolders (excluding vendor/) | Plugin Basics: layout, headers, loading
- Missing license headers | header lacks `License:` or `License URI:` | Plugin Basics: layout, headers, loading
- Text Domain header differs from folder slug | header `Text Domain:\s*(\S+)` != plugin directory name | Internationalization
- Hard-coded wp-content paths | `wp-content/(plugins|uploads|themes)` in PHP strings, or `WP_CONTENT_DIR|WP_PLUGIN_DIR|WP_CONTENT_URL|WP_PLUGIN_URL` | Plugin Basics: layout, headers, loading
- Including wp-load.php or wp-config.php | `(require|include)(_once)?\s*\(?[^;]*wp-(load|config)\.php` | JavaScript
- Reserved or too-short function/class/hook prefix | `function\s+(wp_|_)\w+` or `class\s+(WP_|WordPress)\w*` defined in plugin source | Plugin Basics: Best Practices
- Uninstall script without constant guard | uninstall.php lacks `WP_UNINSTALL_PLUGIN` | Plugin Basics: Uninstall
- Deactivation hook deleting data | `register_deactivation_hook` callback body contains `delete_option|DROP TABLE|delete_post_meta` | Plugin Basics: Uninstall
- Activation hook given a non-main file | `register_(activation|deactivation|uninstall)_hook\(\s*(?!__FILE__)` | Plugin Basics: Activation and Deactivation
- flush_rewrite_rules on every request | `add_action\(\s*'init'[^)]*flush_rewrite_rules` or `flush_rewrite_rules\(` outside activation/deactivation callbacks | Plugin Basics: Activation and Deactivation
- Cron scheduled without guard | `wp_schedule_event\(` not preceded by `wp_next_scheduled` in same function | Cron
- Cron event never cleared | file has `wp_schedule_event` but no `wp_(unschedule_event|clear_scheduled_hook)` | Cron
- DISABLE_WP_CRON defined by a plugin | `define\(\s*'DISABLE_WP_CRON'` | Cron
- Raw cURL or file_get_contents on remote URL | `curl_init\(|file_get_contents\(\s*['"]https?:` | HTTP API
- HTTP result used without error check | `wp_remote_(get|post|request|head)\(` in a function lacking `is_wp_error` | HTTP API
- Table created without dbDelta | `CREATE TABLE` string in PHP without `dbDelta\(` in same file | Creating Tables
- dbDelta SQL uses INDEX or backticks | `CREATE TABLE[\s\S]*?\b(INDEX|` + backtick + `)` in a string passed to dbDelta | Creating Tables
- PRIMARY KEY with one space | `PRIMARY KEY \(` (single space before paren) in dbDelta SQL | Creating Tables
- Hard-coded table prefix | `['"]wp_\w+['"]` as table name or `FROM\s+wp_` | Creating Tables
- Unprepared SQL with variables | `\$wpdb->(query|get_results|get_var|get_row|get_col)\(\s*["'][^"']*(\$|\{\$)` without `prepare` | Creating Tables
- Variable used as text domain | `\b(__|_e|_x|_ex|_n|esc_html__|esc_html_e|esc_attr__|esc_attr_e)\([^)]*,\s*\$\w+\s*\)` | Internationalization
- Variable interpolated into translatable string | `\b(__|_e|esc_html__|esc_html_e|esc_attr__)\(\s*"[^"]*\$` | Internationalization
- Unescaped translation echo | `\b_e\(|echo\s+__\(` (use esc_html_e / esc_html__) | Internationalization
- Missing text domain argument | `\b(__|_e|esc_html__|esc_html_e|esc_attr__|esc_attr_e)\(\s*'[^']*'\s*\)` | Internationalization
- Inline script tags in PHP | `<script[^>]*src=` or `echo\s+['"]<script` in plugin PHP (use wp_enqueue_script) | JavaScript
- Inline stylesheet link tags | `<link[^>]*rel=['"]stylesheet` in PHP output | JavaScript
- Enqueue at load time | `wp_enqueue_(script|style)\(` at file top level, not inside a function body hooked to an enqueue action | JavaScript
- AJAX handler missing nonce check | function hooked via `wp_ajax_` lacking `check_ajax_referer|wp_verify_nonce` | JavaScript
- nopriv AJAX hook | `wp_ajax_nopriv_` (review manually; flag for justification) | JavaScript
- AJAX handler not ending | function hooked via `wp_ajax_` lacking `wp_die|wp_send_json|die|exit` | JavaScript
- Use of $_REQUEST | `\$_REQUEST\b` | JavaScript
- eval of JSON in JS | `\beval\(` in *.js | JavaScript
- Unguarded jQuery `$` in global scope | *.js using `\$\(` without a `jQuery(function($)` / IIFE wrapper | JavaScript
- Meta box save without nonce or capability | function hooked to `save_post` lacking `wp_verify_nonce` or `current_user_can` | Metadata
- Raw superglobal stored in meta | `update_post_meta\([^;]*\$_(POST|GET|REQUEST)` | Metadata
- JSON stored without wp_slash | `update_post_meta\([^;]*json_encode\((?![^;]*wp_slash)` | Metadata
- CPT key longer than 20 chars or wp_ prefix | `register_post_type\(\s*'(wp_\w*|[a-z0-9_-]{21,})'` | Custom Post Types
- CPT registered outside init | `register_post_type\(` at file top level or on a hook other than `init` | Custom Post Types
- REST route without permission_callback | `register_rest_route\(` args lacking `'permission_callback'` | REST API: overview and routes/endpoints
- Misspelled permissions_callback | `'permissions_callback'` | REST API: overview and routes/endpoints
- REST route registered outside rest_api_init | `register_rest_route\(` not inside a function hooked to `rest_api_init` | REST API: overview and routes/endpoints
- Reserved namespace | `register_rest_route\(\s*['"]wp/` | REST API: overview and routes/endpoints
- Namespace without version | `register_rest_route\(\s*'[^'/]+'\s*,` (no /vN segment) | REST API: overview and routes/endpoints
- Superglobals used inside REST callbacks | `\$_(GET|POST|FILES|SERVER|REQUEST)` in files that call `register_rest_route` | REST API: requests
- Public REST write endpoint | `'permission_callback'\s*=>\s*'__return_true'` combined with `CREATABLE|EDITABLE|DELETABLE|'POST'|'PUT'|'DELETE'` (review) | REST API: overview and routes/endpoints
- Privacy exporter/eraser missing | plugin stores user data (`add_user_meta|add_comment_meta|wpdb->insert` with email/ip) but lacks `wp_privacy_personal_data_(exporters|erasers)` | Privacy
- Privacy policy content outside admin_init | `wp_add_privacy_policy_content\(` not inside a function hooked to `admin_init` | Privacy
- Remote scripts or tracking pixels | `src=['"]https?://` for script/img/iframe in PHP, or `wp_enqueue_script\([^)]*https?://` (disclosure needed) | Privacy

## Security (Common APIs Handbook: overview, vulnerabilities, validation, sanitizing, escaping, nonces, capabilities, example)
Source: https://developer.wordpress.org/apis/security/ (sub-pages: /apis/security/common-vulnerabilities/, /apis/security/data-validation/, /apis/security/sanitizing/, /apis/security/escaping/, /apis/security/nonces/, /apis/security/user-roles-and-capabilities/, /apis/security/example/; the old /plugins/security/* pages are stubs pointing here)

Mindset
- Treat all data as untrusted: user input, third-party API replies, and your own database rows. Admins count as users.
- Prefer validation (accept or reject) over sanitization (clean and keep); sanitize only when the value is free-form.
- Validate as early as possible, before any action runs; sanitize on input; escape as late as possible, at the point of output.
- Use core functions for each job instead of hand-rolled code; keep dependencies and your own code patched.

Validation
- Use a safelist: compare against a fixed set of known good values with strict comparison (=== or in_array( $v, $allowed, true )).
- In switch() blocks do your own === check (case true with strict tests), since switch compares loosely.
- Blocklists are rarely right; never rely on them as the only guard.
- Check format with ctype_alnum(), preg_match(), is_email(), validate_file(), term_exists(), username_exists(), count(), mb_strlen().
- Client-side attributes (maxlength, pattern, required) are not validation; repeat every check on the server.
- sanitize_key() before comparing a key against an allowed list (it lowercases, and in_array is case sensitive).
- Use sanitize_html_class( $class, $fallback ) for CSS class names; tag_escape() for tag names (it does not escape anything else).
- Format correction: (int) casts, sanitize_title(), preg_replace() with a whitelist pattern.

Sanitizing (input)
- Free text: sanitize_text_field(); multi-line: sanitize_textarea_field().
- Pick the function for the data type: sanitize_email(), sanitize_file_name(), sanitize_hex_color(), sanitize_html_class(), sanitize_key(), sanitize_mime_type(), sanitize_option(), sanitize_sql_orderby(), sanitize_title(), sanitize_user(), sanitize_url(), wp_kses(), wp_kses_post().
- sanitize_text_field() checks UTF-8, strips all tags, removes line breaks, tabs and extra spaces, strips octets, and turns a lone less-than into an entity.

Escaping (output)
- esc_html() for text inside an element (it removes HTML); esc_attr() for attribute values; esc_url() for every URL in href or src; esc_js() for inline JS; esc_textarea() inside textarea; esc_xml() or ent2ncr() for XML.
- esc_url_raw() is for storing or redirecting a URL, never for echoing.
- To output HTML use wp_kses_post() or wp_kses( $html, $allowed ); wp_kses_data() allows only comment-level HTML.
- Escape on echo, not when building the variable: echo esc_url( $u ), not $u = esc_url( $u ) earlier.
- If you must escape early (generated script blocks), store the result in a variable suffixed _escaped, _safe or _clean, and a function that returns markup must return already-safe HTML.
- Use the combined i18n helpers: esc_html__(), esc_html_e(), esc_html_x(), esc_attr__(), esc_attr_e(), esc_attr_x().
- Numbers: cast with (int), absint() or (float); number_format_i18n() when formatting; intval() and floatval() are acceptable but dated.
- Escape a composed attribute value once as a whole: esc_attr( $prefix . '-box' . $id ), not piecewise.
- Escape a URL with esc_url() only; do not wrap it in esc_attr() or nest esc_attr( esc_url() ).
- Values passed through wp_localize_script() are escaped by WordPress; do not double escape them.
- JS data printed into a script block or an inline handler: esc_js(); JSON in a data attribute: wp_json_encode() (or esc_js()).
- A nonce echoed into an HTML attribute must be escaped like any other attribute value.

SQL injection
- Use WordPress functions (add_post_meta(), WP_Query, etc.) first; when raw SQL is unavoidable, use $wpdb->prepare() with %s, %d (and %f) placeholders for every value.

XSS and CSRF
- Any form or state-changing URL needs a nonce plus a capability check.
- Escaping is the XSS defense, nonces are the CSRF defense; neither replaces the other.

Nonces
- Create: wp_nonce_field( 'action_' . $id, 'name' ) for forms (also emits _wp_http_referer unless told not to), wp_nonce_url( $url, 'action_' . $id ) for links (field _wpnonce by default), wp_create_nonce( $action ) for AJAX or custom use.
- Make the action string as specific as possible (include the object ID).
- Verify: check_admin_referer( $action, $field ) for admin forms and URLs (checks nonce and referrer, dies with 403 on failure); check_ajax_referer( $action ) for AJAX (default fields _wpnonce or _ajax_nonce); wp_verify_nonce( $nonce, $action ) elsewhere.
- If wp_verify_nonce() returns false, stop processing (usually wp_nonce_ays() or wp_die()); it returns 1 or 2 (tick) when valid.
- Nonces are not authentication, authorization or access control and are not one-time; always pair them with current_user_can().
- Default lifetime is one day (effective 12 to 24 hours, two 12-hour ticks); change with the nonce_life filter (seconds).
- Core gives guests the same nonce (user ID 0); for critical guest actions build your own session and hook nonce_user_logged_out.
- Nonces tied to a login session become invalid if the user logs in or out in another tab.

Capabilities (roles)
- Run any code that reads or writes user-submitted data, on admin or public side, only after current_user_can( $cap ) passes; pick the narrowest suitable capability (manage_options for settings, edit_others_posts for editor-level actions).
- Register hooks conditionally on the capability, or check inside the handler; never expose an unauthenticated action URL that trashes or changes data.
- The complete safe pattern is: capability check, nonce check, validate, sanitize, act, escape output, wp_safe_redirect() then exit.
- Use wp_safe_redirect() (not wp_redirect()) for internal redirects.

Filesystem API
Source: https://developer.wordpress.org/apis/filesystem/
- Write local files through WP_Filesystem (global $wp_filesystem) rather than raw PHP file functions, so hosts with mismatched file ownership still work.
- Call request_filesystem_credentials( $nonced_url, '', false, false, $form_fields ) then WP_Filesystem( $creds ); if it fails, call request_filesystem_credentials() again with the error flag true and stop.
- If request_filesystem_credentials() returns false it has printed a form; stop processing so the user can answer.
- Do not name your own form inputs hostname, username, password, public_key or private_key (reserved by the credentials form).
- The function is only available in wp-admin and after wp_loaded; the earliest safe hook is admin_init.
- Do not prompt for credentials on activation; use get_filesystem_method() and proceed silently if it returns 'direct', otherwise show an admin_notices link that triggers the prompt.
- Translate paths for non-direct methods: str_replace( ABSPATH, $wp_filesystem->abspath(), $path ); use $wp_filesystem->wp_content_dir() and wp_plugins_dir().
- Methods: put_contents() (with FS_CHMOD_FILE), get_contents(), get_contents_array(), mkdir(), rmdir(), is_dir().
- unzip_file( $file, $to ): $file is the direct absolute path, $to is the Filesystem-API path.

## Settings (Options API, Settings API, custom settings page)
Source: https://developer.wordpress.org/plugins/settings/ (sub-pages: /plugins/settings/options-api/, /plugins/settings/settings-api/, /plugins/settings/using-settings-api/, /plugins/settings/custom-settings-page/)
- Hook register_setting(), add_settings_section() and add_settings_field() on admin_init.
- register_setting( $option_group, $option_name, $args ): pass a sanitize_callback in $args so saved values are cleaned.
- Render the form with action="options.php" method="post", then settings_fields( $group ), do_settings_sections( $page ), submit_button(); options.php enforces nonces and manage_options.
- Still check current_user_can( 'manage_options' ) at the top of the page callback and return if it fails.
- Show feedback with add_settings_error() and settings_errors(); WordPress adds the settings-updated query arg after a save.
- Create the menu on admin_menu with add_menu_page() or add_submenu_page(), capability manage_options; prefer adding a section to an existing page over a whole new top-level page.
- Field callbacks: use $args['label_for'] for the label link and id, $args['class'] for the row class; escape every value (esc_attr(), esc_html__()) and use selected()/checked() helpers.
- Never define functions inside callbacks (they may run twice and fatal).
- Options API: add_option(), get_option( $name, $default ), update_option(), delete_option(); network variants add_site_option() and siblings.
- Store related settings as one array option, not many single options, to cut database queries.
- Options are saved in the options table; prefix every option name with your unique prefix.
- Output option values escaped (esc_html( $opts['title'] )) even if they were sanitized on save.

## Shortcodes
Source: https://developer.wordpress.org/plugins/shortcodes/ (sub-pages: /plugins/shortcodes/basic-shortcodes/, /plugins/shortcodes/enclosing-shortcodes/, /plugins/shortcodes/shortcodes-with-parameters/, /plugins/shortcodes/tinymce-enhanced-shortcodes/)
- Register with add_shortcode( $tag, $callback ), preferably on init; remove with remove_shortcode() after the original is registered (later priority); test with shortcode_exists().
- A shortcode handler must return its output, never echo or print (side effects break layouts); use ob_start() and return the buffer if you need templates.
- Prefix the shortcode tag to avoid collisions with other plugins.
- Handler signature: ( $atts = array(), $content = null, $tag = '' ); $content === null (is_null) means self-closing.
- Normalize attribute keys with array_change_key_case( (array) $atts, CASE_LOWER ), then merge defaults with shortcode_atts( $defaults, $atts, $tag ).
- Sanitize attributes and escape everything you return; the handler alone is responsible for output safety.
- Nested shortcodes in $content are not parsed automatically; run do_shortcode( $content ) when you want them.
- Do not mix enclosing and self-closing uses of the same tag; the parser cannot tell them apart.
- Document every attribute for users (readme or settings help).

## Taxonomies
Source: https://developer.wordpress.org/plugins/taxonomies/ (sub-pages: /plugins/taxonomies/working-with-custom-taxonomies/, /plugins/taxonomies/split-terms-wp-4-2/)
- Register on init: register_taxonomy( $taxonomy, $object_types, $args ) with labels, hierarchical, show_ui, show_admin_column, query_var, rewrite => [ 'slug' => ... ].
- Use a prefixed, unique taxonomy key and rewrite slug to avoid clashes.
- Flush rewrite rules only on activation and deactivation, never on every request.
- Never store term IDs without handling splits (WordPress 4.2+): hook split_shared_term ( $term_id, $new_term_id, $term_taxonomy_id, $taxonomy ) and update stored IDs in options, post meta, user meta.
- For already stored IDs, validate with wp_get_split_term( $old_id, $taxonomy ) (or wp_get_split_terms()) on plugin update.
- Output helpers: the_terms(), wp_tag_cloud(), taxonomy_exists() to check existence.

## Users (roles, capabilities, user meta, user functions)
Source: https://developer.wordpress.org/plugins/users/ (sub-pages: /plugins/users/roles-and-capabilities/, /plugins/users/working-with-user-metadata/, /plugins/users/working-with-users/)
- Follow least privilege: create roles when needed and check a capability before every sensitive action.
- add_role() persists in the database on first call and later calls do nothing; run it on activation (or guarded by a version check), not every request.
- To change a role's capabilities, remove_role() then add_role() only when they differ, or use get_role()->add_cap() / remove_cap().
- Do not remove the Administrator or Super Admin roles; if you delete subscriber, update_option( 'default_role', ... ).
- If you add capabilities to an existing role on init, use a later priority than the role creation.
- Custom capabilities have no effect in core admin; check them yourself in your screens.
- Check: current_user_can( $cap, ...$object_args ) for the current user, user_can( $user, $cap ), current_user_can_for_blog( $blog_id, $cap ) on multisite; pass an object ID (such as a post ID) to test per-object caps.
- User meta: add_user_meta(), update_user_meta(), delete_user_meta(), get_user_meta( $id, $key, $single ); get_user_meta with only an ID returns all meta.
- Profile fields: output with show_user_profile and edit_user_profile; save with personal_options_update and edit_user_profile_update.
- In the save handler, check current_user_can( 'edit_user', $user_id ) and a nonce, then sanitize and validate $_POST data before update_user_meta() (the handbook sample omits this; do not copy that).
- Create users: check username_exists() and email_exists() first; wp_create_user( $login, $pass, $email ) or wp_insert_user( $userdata ); generate passwords with wp_generate_password().
- wp_insert_user() fires user_register on create and profile_update on update; always check is_wp_error() on the result.
- Update with wp_update_user( [ 'ID' => ... ] ); changing the current user's password clears their cookies; use update_user_meta() for a single meta value.
- wp_delete_user( $id, $reassign ): without a valid reassign user ID all of that user's content is deleted; fires deleted_user.
- Never trust $_POST for new-user fields; sanitize and validate before wp_insert_user().

## WordPress.org Plugin Directory: overview and requirements
Source: https://developer.wordpress.org/plugins/wordpress-org/
- Plugin license must be GPLv2 or later compatible; with no license stated it is treated as GPLv2 or later.
- The SVN repository is only for functional WordPress plugins.
- Respect copyright and trademark law; no illegal, dishonest or offensive behavior (spam, harassment).
- Free forum support, statistics and reviews come with hosting; use the #pluginreview Slack channel for hosting help.

## Detailed Plugin Guidelines (18 guidelines)
Source: https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/ (also /plugins/wordpress-org/compliance-disclaimers/)
- General: keep your WordPress.org contact email current; auto-replies and ticket-system forwarders are not allowed; everyone with commit access or support duty must follow the guidelines, forum rules and community guidelines.
- General: security is the developer's responsibility; insecure plugins are closed until fixed, and the Security team may patch in extreme cases.
- G1: all code, data and images in the plugin must be GPLv2-or-later or GPL-compatible, including bundled third-party libraries, fonts and images.
- G2: you are responsible for every file and its license; verify before uploading to SVN and obey the terms of any third-party service or API you call.
- G2: never write code meant to dodge guidelines or restore code the reviewers asked you to remove.
- G3: the directory copy is the only distributed version; keep it current and stable if you also distribute elsewhere.
- G4: no obfuscation (packer, uglify mangle, meaningless names like $z12sdf813d); code must be mostly human readable.
- G4: minified or compiled files need public, maintained source access: ship the source in the plugin or link the dev repository in readme.txt, and document the build tooling.
- G5: no trialware: no locked features, no features that stop after a trial or quota, no sandbox-only API access; all code in the plugin must work.
- G5: put premium code in a separate add-on hosted outside WordPress.org; ad-hoc upsells are fine within G11 limits.
- G6: SaaS is allowed if the service has real substance and is documented in readme.txt (link its Terms of Use).
- G6: not allowed: a service that only validates licenses or keys while all features are local, moving code to a server to fake a service, storefront-only front-ends.
- G7: no contacting external servers or tracking without explicit opt-in consent (registration or a settings checkbox); document collected data and use in readme.txt, ideally with a privacy policy link.
- G7: prohibited: automatic data collection, tricking users into submitting data to use the plugin, offloading unrelated assets, undocumented external data such as blocklists, ad systems that track views.
- G7: SaaS consent is implied when the user installs, registers and configures that service.
- G8: never install or update plugins, themes or add-ons from servers other than WordPress.org; never ship an in-plugin premium upgrade installer.
- G8: no third-party CDNs except for fonts; all non-service JS and CSS must be local; no remote-managed data lists unless the service permits it; no iframes to load admin pages.
- G8: external loading from a documented service is allowed if communication is as secure as possible (HTTPS).
- G9: no illegal, dishonest or offensive acts: no keyword stuffing or black-hat SEO, no promising traffic, no paid or coerced reviews, no implying features need payment, no sockpuppet accounts, no passing off others' plugins, no botnet or crypto-mining on the user's server, no exploiting guideline loopholes.
- G9: never imply the plugin creates, provides, automates or guarantees legal compliance (ADA, GDPR, cookie law, VAT, HIPAA, PCI); say it helps with compliance and that no plugin gives 100%.
- G9 (compliance): remove "100% compliant" or similar claims from readme, docs, screenshots, banners and the plugin display name; a service must state that the service, not the code, handles compliance, with a dated proof link.
- G9 (compliance): inaccurate claims get a warning, then closure after about 60 days; a plugin closed for other reasons must fix the readme before reopening.
- G10: credits, "Powered by" text and external links on the public site must be opt-in and off by default, clearly worded; the plugin must work without them (services may brand their own output).
- G11: do not hijack wp-admin: keep upgrade prompts and notices rare and in context (ideally only on your settings page).
- G11: site-wide notices and dashboard widgets must be dismissible or self-dismiss; error notices must say how to fix the problem and remove themselves when fixed.
- G11: avoid ads in the admin; no referral tracking through them (G7); links to your own site and local images are fine.
- G12: readme must not spam: no needless affiliate links, no competitor tags, no more than 5 tags total, no keyword stuffing; write for people.
- G12: affiliate links must be disclosed and point directly at the affiliate service, not a redirect or cloaked URL; links to required products (a parent plugin or theme) are fine in moderation.
- G13: do not bundle libraries WordPress already ships (jQuery, Atom Lib, SimplePie, PHPMailer, PHPass, etc.); use the core copy.
- G14: SVN is a release repository; commit only deployment-ready code (stable, beta or RC) with a meaningful message, no rapid tweak commits or "update" messages; readme edits to mark a new WP version are the exception.
- G15: bump the plugin version on every release; trunk readme.txt must always match the current version; tag releases.
- G16: a complete working plugin zip must exist at submission; names cannot be reserved for later and unused slugs may be given to others.
- G17: do not start a slug or name with someone else's trademark or project name (e.g. "wordpress"); use "Thing for Brand", not "Brand Thing", unless you officially represent the brand.
- G18: the team may update guidelines, close or remove any plugin, remove developer access, and patch plugins for public safety.

## Common issues (Plugin Review Team)
Source: https://developer.wordpress.org/plugins/wordpress-org/common-issues/

Security: sanitize, escape, validate
- Sanitize early, escape late, validate always; sanitize every $_POST, $_GET, $_REQUEST and $_FILES value with the function that matches its type.
- Escape every echoed variable, option and generated string with the function matching the context (esc_html, esc_attr, esc_url, wp_kses_post); options saved sanitized still need escaping on output.
- Escape functions are not sanitizers and sanitize functions are not escapers (both are filterable); to echo input do esc_html( sanitize_text_field( ... ) ).
- filter_var(), filter_var_array(), filter_input(), filter_input_array(): always pass an explicit sanitizing filter (e.g. FILTER_SANITIZE_NUMBER_INT); the default FILTER_DEFAULT does not sanitize.
- wp_verify_nonce(): pass wp_unslash() plus sanitize_text_field() input, e.g. wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['n'] ) ), 'action' ), and test isset() first.
- Never process the whole $_POST, $_GET or $_REQUEST array; read only the keys you need.
- esc_url_raw() is a sanitizer for database storage or redirects; use esc_url() to escape URLs on output.
- __() and _x() return unescaped text; use esc_html__(), esc_attr__(), or wrap in esc_html(), esc_attr(), wp_kses_post().
- _e() and _ex() echo unescaped; use esc_html_e(), esc_attr_e(), or echo esc_html( _x( ... ) ).
- Echo JSON with wp_json_encode() and do not weaken it with flags; usually return JSON (REST, AJAX) rather than echo it into pages, and sanitize values before they go into the JSON.
- esc_html() is not for HTML; to print markup use wp_kses_post() or wp_kses( $html, $allowed_tags ).

Files
- Use wp_handle_upload() (or media_handle_upload()), never move_uploaded_file() directly, so core checks run.
- Never use, set or test ALLOW_UNFILTERED_UPLOADS, not even in a conditional; add safe extra types via the upload_mimes filter (see wp_get_mime_types()).
- Do not load images, JS, CSS or other files from remote servers (CDNs, jQuery.com, your own domain); bundle them locally or use the copy WordPress ships.
- Remote calls are only for genuine services (Akismet-style API, Disqus-style comments, oEmbed to YouTube or Twitter, Google Fonts); then explain the service, servers called and any account requirement in readme.txt.
- Do not embed an iframe for help docs; link to them or include them locally.

Libraries
- Do not use beta, alpha or dev versions of libraries unless a needed feature requires it and you explain why.
- Do not use libraries that are no longer maintained by their authors.
- Keep third-party libraries up to date with the latest stable release.

Database
- Every query with variables goes through $wpdb->prepare(); no concatenating or interpolating values into SQL.
- For IN() lists, build one placeholder per item (array_fill() with '%d' or '%s', implode, then pass the merged value array to prepare()).
- Table or column names cannot be placeholders; use a hard-coded safelist for them.

PHP and code style
- Do not use HEREDOC or NOWDOC (scanners miss missing escaping inside them).
- Do not use short open tags (<? and <?=); always <?php.
- Every PHP file that executes code when loaded directly must start with: if ( ! defined( 'ABSPATH' ) ) { exit; }.
- Do not set PHP settings globally (ini_set( 'memory_limit', ... ) on init or in a constructor); scope any change to the single function that needs it.
- Do not call date_default_timezone_set(); WordPress expects UTC and core time functions break otherwise.
- Do not call error_reporting() in production code.
- Use wp_remote_get(), wp_remote_post() and the HTTP API instead of your own curl calls (curl inside vendor libraries is acceptable; tune with the http_api_curl hook).
- Load assets with wp_register_script()/wp_enqueue_script(), wp_add_inline_script(), wp_register_style()/wp_enqueue_style(), wp_add_inline_style() on wp_enqueue_scripts, admin_enqueue_scripts, login_enqueue_scripts; no hard-coded script or link tags.
- Do not bundle libraries core already includes; if you need an extra add-on file (one jQuery UI component), include only that file.

Naming and prefixing
- Prefix every global function, class, constant (define), namespace, option, transient, global variable, hook name and shortcode with a unique plugin-specific prefix of four or more characters; two or three letter prefixes are rejected.
- Never start your function names with wp_, __ or a single _ (reserved for core); using them as method names inside your classes is fine.
- Do not wrap everything in if ( ! function_exists() ); reserve that for shared libraries.
- Main plugin file name must equal the plugin folder and slug (my-plugin/my-plugin.php); avoid generic main file names.

Plugin standards
- Plugin headers go in the main file only and must be complete (see Plugin Headers: Plugin Name, version, license, text domain, etc.).
- readme.txt (not readme.md) is required and must validate in the readme validator; it must be complete for first plugins, plugins with dependencies, and plugins calling external services.
- Declare a GPL-compatible license in both the plugin header (License) and readme.txt (License); both must name the same license, with one license declared for your own code.
- Stable tag must be a real version equal to the Version header; do not use "trunk"; bump both for every release (SemVer recommended).
- Text domain must be the plugin slug, and gettext function arguments (text, context, domain) must be plain string literals, never variables or function calls; use printf() with placeholders and a /* translators: */ comment for dynamic values.
- Do not activate, deactivate or change the status of other plugins; only deactivate your own plugin if a dependency is missing; prefer the "Requires Plugins" header (WordPress 6.5 dependencies).
- No update checker or phoning home for updates; do not interfere with the built-in updater.
- Document every third-party or external service in readme.txt: that it is used and when, a link to the service, and links to its terms of use and privacy policy.
- Do not ship development leftovers: tests, demos, dev tooling, bower, node or grunt folders, unneeded vendor folders; keep and link human-readable source and config such as composer.json.
- Do not ship unusual file types; plugin zips should contain code (php, js, css, txt, md), images (png, svg, jpg) and data (json, xml) only.
- Do not include code from "premium" libraries that are forbidden in free plugins.
- Remove any non-GPL-compatible code and replace it with GPL-compatible code.
- Compressed or built JS and CSS must have public non-compressed sources, included or linked in readme.txt (also in code comments if linked).
- If you use Composer, include composer.json in the plugin even if only used for development.

## Block Directory and block-specific guidelines
Source: https://developer.wordpress.org/plugins/wordpress-org/add-your-plugin-to-the-block-directory/ (also /plugins/wordpress-org/block-specific-plugin-guidelines/)
- Block Directory listing is only for Block Plugins (a single top-level block plus minimal support code); bigger plugins with blocks can be listed by emailing plugins@wordpress.org.
- B1: no UI outside the editor (no options pages or admin menus); keep PHP minimal; plugins that only restyle or extend existing blocks are not eligible.
- B2: one independent top-level block per plugin; multiple blocks only for a clear parent/child dependency (list and list item).
- B3: plugin and block titles must describe the block; names must not be generic ("Widget", "Image Block") or look like core; trademark rules apply to block titles too.
- B3a: block name must be unique and namespaced with the author or plugin slug (e.g. author/block); core and wordpress namespaces are reserved.
- B4: ship a valid block.json with name, title, at least one of script or editorScript, and at least one of style or editorStyle.
- B5: the block must work on its own with no required plugin or theme; optional integrations are fine.
- B6: no extra steps (installing another plugin, sign-up, login, manual service connection) and no payment; donation links in readme are fine; external APIs only when seamless without login or key and not for work doable locally.
- B7: prefer the REST API to custom PHP; any PHP must be minimal, clear and documented.
- B8: no ads, dashboard notices or other obtrusive messages unrelated to the block.
- Check eligibility with the Block Checker tool before adding or removing the plugin from the Block Directory.

## Alerts and warnings, automated security review
Source: https://developer.wordpress.org/plugins/wordpress-org/alerts-and-warnings/ (also /plugins/wordpress-org/automated-security-review/)
- Update "Tested up to" in readme.txt for every major WordPress release (no new version needed) or the plugin gets an out-of-date warning (shown when the last 3 major releases are not supported).
- Closure reasons shown publicly after 60 days: author request, guideline violation, licensing or trademark violation, merged into core, security issue.
- Every release now passes an automated security review (AI models plus Jetpack Scan) during a cooldown before distribution through the update API.
- A release scoring above the blocking threshold is withheld; all committers get an email with findings (risk score, summary, file and line); sites keep the previous version and the plugin is not closed.
- Fix the findings and release a new version (the fastest path); a blocked version stays blocked and the new one is reviewed again.
- For a false positive reply to the notification email; releasing a fix is usually faster than an appeal.
- Write code so a scanner finds nothing high risk: escaped output, prepared SQL, capability and nonce checks, no remote code loading.

## Subversion
Source: https://developer.wordpress.org/plugins/wordpress-org/how-to-use-subversion/
- SVN is a release system, not development; every commit regenerates all zips (updates can take up to 6 hours to appear); push once when ready.
- Layout: /trunk for code, /tags/<version> for releases, /assets for images and screenshots; /branches is no longer created.
- Main plugin file and readme.txt sit directly in /trunk, never in /trunk/my-plugin/; subfolders are fine for included files.
- Tag names are version numbers (digits and periods only); create tags with svn cp trunk tags/X.Y.Z (not cp), and commit trunk and tag together.
- Update Stable tag in trunk/readme.txt when tagging; readme.txt inside the tag must also show the right Stable tag.
- Keep trunk as the latest code (even beta); do not leave trunk as an empty placeholder or use trunk as the stable tag.
- Keep only the last one or two minor releases in /tags.
- Put screenshots, banners and icons in /assets, not in trunk.
- Every svn commit needs a message; your SVN username is case sensitive and can use a separate SVN password.
- Commit only what you are willing to ship to every user (vendor files, .gitignore, etc. included); never commit zip files.
- svn:externals are not included in the downloadable zip; do not rely on them.

## readme.txt
Source: https://developer.wordpress.org/plugins/wordpress-org/how-your-readme-txt-works/
- Header fields: Contributors (case sensitive WordPress.org usernames), Donate link (optional), Tags, Requires at least, Tested up to, Stable tag, Requires PHP, License, License URI (optional).
- Tags: 1 to 5 comma-separated terms; no competitor names; tags unique to your plugin are not shown; only the first 5 count.
- Tested up to: numbers only ("6.8", not "WP 6.8"), major version only, never above the current release candidate or active version.
- Requires PHP and Requires at least are read from the main plugin file header (since WordPress 5.8), not from the readme.
- Requires PHP: numbers only ("7.4"); Stable tag: only digits and periods, a plugin version, not a WordPress version, never "trunk" for new plugins.
- Short description (first paragraph after the header): at most 150 characters, no markup, or it is cut off.
- Plugin name, Plugin URI, Author URI and version come from the main plugin file; Plugin URI must be unique to each plugin (do not reuse the free plugin URI for the pro plugin).
- The directory reads trunk/readme.txt for Stable tag, then reads everything else from the readme in /tags/<stable tag>/; edits to the description in trunk are ignored when the tag exists.
- The displayed version number comes from the Version header in the main file, not from the tag folder name.
- Keep readme.txt under 10k (larger may error); keep the current release and at most one major version back in the changelog and move older entries to changelog.txt.
- Do not use the description as a sales pitch; FAQ should answer real questions; link out for long docs.
- Videos: paste a YouTube or Vimeo URL on its own line (not as the last line of an FAQ answer); VideoPress uses the wpvideo shortcode.
- Screenshots section: one numbered line per screenshot, the text becomes the caption.
- Readme markup is a Markdown subset; validate with the readme validator; use custom sections sparingly.
- Cosmetic readme or asset changes need no new version, but update both trunk and the tag.

## Planning, submitting, maintaining
Source: https://developer.wordpress.org/plugins/wordpress-org/planning-submitting-and-maintaining-plugins/
- Test across environments first; pick a unique non-infringing name (slug is permanent, display name can change).
- Display name comes from Plugin Name in the main file; the readme should state a concise description, install steps, any required registration (with link) and how to get support.
- Register with a valid regularly checked email (an official company email for company plugins) and whitelist plugins@wordpress.org.
- Submit a complete ready-to-run zip; first review takes up to about 14 business days; after approval you get an SVN repository.
- Release regularly but avoid update fatigue; use the support forum and respond promptly.

## Plugin assets
Source: https://developer.wordpress.org/plugins/wordpress-org/plugin-assets/
- Assets live in the top-level /assets SVN folder (not trunk/assets, not tags/x/assets) and apply to all versions; CDN caching can delay changes by hours.
- Banners: banner-772x250.(png|jpg) and banner-1544x500 (retina, only as an add-on to the 772 one); max 4MB; localized forms banner-772x250-rtl, -es, -es_ES; do not invent other sizes or names.
- Icons: icon-128x128.(png|jpg|gif), icon-256x256, or icon.svg; an SVG icon requires a PNG fallback; max 1MB.
- Screenshots: screenshot-1.(png|jpg), screenshot-2, etc., lowercase names only, local files only (not external links), localized as screenshot-1-de; max 10MB; one per readme Screenshots line.
- If images download instead of displaying, set svn:mime-type image/png and image/jpeg on them.
- Do not use official third-party logos in banners or icons; do not copy English images into RTL or locale names without change.

## Previews and blueprints
Source: https://developer.wordpress.org/plugins/wordpress-org/previews-and-blueprints/
- Plugin Preview needs a valid /assets/blueprints/blueprint.json (only one supported) and a committer must set preview to public in the Advanced view.
- Blueprint steps can set landingPage, preferredVersions (php, wp), phpExtensionBundles, login, installPlugin, installTheme, setSiteOptions, runPHP.
- Test the plugin in Playground and fix Playground-specific bugs before committing the blueprint; use the generated blueprint as a starting point.
- Do not put real credentials in a blueprint; login steps are for the throwaway Playground site only.

## Release confirmation emails
Source: https://developer.wordpress.org/plugins/wordpress-org/release-confirmation-emails/
- Opt-in per plugin: after tagging in SVN each release must be confirmed on the Release Management dashboard via an emailed tokenised link.
- Requires tagged releases (not trunk), an updated Stable tag in trunk/readme.txt, committers with direct inboxes (no shared or ticket inboxes), and no edits to a tag after release (not even readme "Tested up to").

## Reporting plugin security issues
Source: https://developer.wordpress.org/plugins/wordpress-org/reporting-plugin-security-issues/
- Email plugins@wordpress.org with a clear description, the plugin link, whether you validated it, and optional public disclosure links; do not disclose publicly.
- Try to contact the developer privately first; core vulnerabilities go to the core security process, not the plugin team.
- No CVE or bounty help from the plugin team; plugins are usually closed until fixed.

## Special roles
Source: https://developer.wordpress.org/plugins/wordpress-org/special-user-roles-capabilities/
- Everyone who commits or gives support needs their own single-human account; no shared accounts.
- Roles: Owner (one, must keep commit access), Committer (SVN, can add or remove committers and request closure), Support Rep (forum label and resolve rights, no code access), Contributor (listed in readme Contributors, no management rights).
- Only existing committers can add or remove committers and support reps; add contributors by listing their WordPress.org username in readme Contributors.

## Take over and transfer
Source: https://developer.wordpress.org/plugins/wordpress-org/take-over-an-existing-plugin/ (also /plugins/wordpress-org/transferring-your-plugin-to-a-new-owner/)
- Adopting: contact the original developer first (email, support page, GitHub issue); if no reply in 30 days ask the Plugins Team with a reviewed zip.
- Updated adopted code must document new ownership in the readme, add your copyright without removing earlier ones, remove calls and links to the previous owner's resources, keep the original purpose, give an upgrade path for major changes, and bump the version.
- Adopting inherits reviews and support posts; plugins closed for security must have all issues fixed; large (100k+) or license-closed plugins are less likely to be approved.
- Transfer under 10,000 users: add the new owner as committer and as readme Contributor, then use Transfer Your Plugin in the Danger Zone of the Advanced tab.
- Transfer over 10,000 users, or featured or beta: email plugins@wordpress.org from the current owner's address with the reason, new user ID and any status change.

## Forums
Source: https://developer.wordpress.org/plugins/wordpress-org/using-the-forums/
- Guidelines apply to all staff and support reps; the plugin owner is responsible for coworkers.
- No selling or supporting non-hosted products in the forums; WordPress.org users are not customers: never ask for private contact details, offer to log in to their site, or charge for forum help.
- You may direct paying customers or service users to your own ticket system and may tell people free support is limited; state this at the top of the readme description.
- A company owner account may not post in forums; no shared accounts, no sockpuppets.

## Developer FAQ
Source: https://developer.wordpress.org/plugins/wordpress-org/plugin-developer-faq/

Submission
- Submit a .zip under 10MB, installable through Upload Plugin, production-ready (no logs, dev tools, test folders, full node or vendor trees, placeholders).
- Only one plugin in review at a time (up to 10 for authors with over 1 million active installs); no multiple accounts to bypass; if rejected after 3 months resubmit, otherwise reply to the review email and never resubmit.
- Wrong user ID on submission: reply immediately, do not resubmit; update files or your slug (once) from the submission page.
- Review emails come from plugins@wordpress.org; replies expected within about 10 business days; unfinished reviews are rejected after 3 months.
- Slug comes from Plugin Name in the main file and fixes the URL, folder name, SVN path and text domain; it cannot change after approval, only the display name can.
- Slug rules: English letters and digits only, no vulgarities, no version numbers, no "wordpress" or "plugin" (except extreme cases), no leading trademark or project term; new slugs beginning with woo must use wc instead.
- Permission from a company does not allow its trademark as the slug start; only the official owner may, from an organization account with a company email.
- Do not circumvent a blocked term by respelling or hyphenating it.
- Do not claim to be an official source; name connectors as "Connector to X Service" or "X for Brand"; avoid WordPress or Plugin in the display name; keep display names under 5 words and unique.
- Rebranding an existing plugin: upgrade it as a major release rather than submitting a new plugin (reviews, users and support cannot be moved).
- Display name must match in the main plugin file and readme.txt.

Not accepted
- No plugins with no meaningful purpose, black-hat SEO, content spinners, fake content generators, scrapers, hate-related tools, or anything facilitating illegal activity.
- No new plugins that insert or execute arbitrary code (PHP or JS editors, file managers, AI code generators executing on the site); HTML output is fine when escaped.
- No code downloaded or executed from external sources and no plugins that only install other plugins.
- No framework, boilerplate or library plugins (package shared code inside each plugin instead); no copies of core functionality or near duplicates without clear differentiation.
- Obvious rejection causes: no readme.txt for a service plugin, not testing with WP_DEBUG, custom copies of packaged JS libraries, unneeded external files, "Powered by" links, phoning home.

SVN and releases
- Put code directly in trunk, tag releases by copying trunk, put images in /assets; no main plugin file or readme in a trunk subfolder (breaks the zip generator).
- No zips or compressed archives in the plugin; minified JS is fine only if unminified source is included or linked in the readme.
- Plugin goes live as soon as code is pushed to SVN and the only off switch is closure, so push only when ready.
- Ship a new version for every code change; readme or asset only changes do not need one but must be applied to trunk and the tag.
- Tested up to: the version you tested, at most the current release candidate (or active release); never 6.5 or 7 speculatively.
- Changelog: keep the current major release (e.g. 3.9.1 and 3.9) in readme.txt, move the rest to changelog.txt.
- Tags in readme: 5 maximum, only the first five count, unique-only tags are hidden.
- Directory changes can take hours; wait 6 hours before asking; search indexing takes 6 to 14 days.

Closure and ownership
- Closing: you can close your own plugin from the Advanced tab (permanent, over 10,000 users needs an email); temporary closure is not allowed, instead fix the bug or mark the plugin unsupported or "public beta".
- Closed plugins stop generating zips but SVN stays public; reasons appear after 60 days; closures can occur for unused plugins (6 months), broken SVN (12 months) or readmes declaring deprecation.
- Reopening requires fixing everything and passing a current standards and security review.
- Everyone representing the plugin (employees, support) is the owner's responsibility; a final warning must be taken seriously.
- Use committers for code access, readme Contributors for credit; do not list people who only inspired you; remove inactive committers (never yourself).
- Treat unsolicited purchase offers with suspicion; new owners are bound by all guidelines and own the plugin's behavior.
- Do not use official logos as plugin icons or banners.
- Report copycats, uncredited code or security issues to plugins@wordpress.org; there are no CVE services or bounties.

## MCP server
Source: https://developer.wordpress.org/plugins/wordpress-org/using-the-mcp-server/
- The WordPress.org MCP server (npx -y @wporg/mcp, needs Node 18+) gives AI tools validate-readme, get-plugin-status and submit-plugin actions plus guideline resources and prompts; it does not bypass review.
- You are responsible for all AI-generated code; review every change for vulnerabilities, license problems and needless external calls.
- Run Plugin Check locally before every submission (a prerequisite for review); the Submit tool is only for new plugins and ones still under review; approved plugins update through SVN.
- Authorization creates one application password per account (shown once, revoked on re-authorization); keep it out of source control and revoke it in Application Passwords on the profile.

## Machine-checkable (part 2: security, settings, users, WordPress.org)
- Direct upload handling instead of wp_handle_upload | `move_uploaded_file\s*\(` in *.php excluding vendor | Common issues: Files
- ALLOW_UNFILTERED_UPLOADS used anywhere | `ALLOW_UNFILTERED_UPLOADS` in *.php | Common issues: Files
- HEREDOC or NOWDOC syntax | `<<<\s*['"]?[A-Za-z_]` in *.php excluding vendor | Common issues: HEREDOC
- PHP short open tag | `<\?(?!php|xml|=)\s` and `<\?=` in *.php excluding vendor | Common issues: Short tags
- Unescaped translation echo | `\b_e\s*\(` or `\b_ex\s*\(` (not preceded by esc_html or esc_attr) in *.php | Common issues: Escape
- __() or _x() echoed directly | `echo\s+(__|_x)\s*\(` in *.php | Common issues: Escape
- esc_url_raw echoed | `echo\s+esc_url_raw\s*\(` | Common issues: Escape
- Raw superglobal echoed | `echo\s+[^;]*\$_(GET|POST|REQUEST|COOKIE|SERVER)\b` in *.php | Security: Escaping
- Nonce verified on unsanitized input | `wp_verify_nonce\s*\(\s*\$_(POST|GET|REQUEST)` | Common issues: Sanitize nonces
- Whole superglobal processed | `foreach\s*\(\s*\$_(POST|GET|REQUEST)\s+as` or `array_map\s*\([^)]*\$_(POST|GET|REQUEST)\s*\)` | Common issues: Processing whole input
- filter_input or filter_var without a filter argument | `filter_input\s*\(\s*INPUT_\w+\s*,\s*['"][^'"]+['"]\s*\)` | Common issues: filter functions
- Loose in_array (no strict true) | `in_array\s*\(\s*[^,()]+,\s*[^,()]+\)` | Security: Validation
- register_setting with no args or sanitize callback | `register_setting\s*\(\s*['"][^'"]+['"]\s*,\s*['"][^'"]+['"]\s*\)` | Settings
- wp_delete_user without reassign | `wp_delete_user\s*\(\s*[^,()]+\)` | Users
- SQL string with interpolated variable passed straight to $wpdb | `\$wpdb->(query|get_results|get_row|get_var|get_col)\s*\(\s*["'][^"']*(\$|\{\$)` | Common issues: WPDB
- Missing direct-access guard | PHP file with executable top-level code and no `defined\s*\(\s*['"]ABSPATH['"]` | Common issues: Direct file access
- Raw curl in plugin code | `curl_(init|exec|setopt)\s*\(` in *.php outside vendor | Common issues: HTTP API
- Global PHP settings changed | `ini_set\s*\(\s*['"]memory_limit['"]` or `date_default_timezone_set\s*\(` or `\berror_reporting\s*\(` | Common issues: PHP
- Reserved function prefix | `^function\s+(wp_|__|_)[A-Za-z0-9_]*\s*\(` at top level (not inside a class) | Common issues: Prefixing
- if-not-function_exists wrapper on plugin functions | `if\s*\(\s*!\s*function_exists\s*\(` in plugin-owned files | Common issues: Prefixing
- Gettext with variable text or domain | `\b(__|_e|_x|_n|esc_html__|esc_attr__|esc_html_e|esc_attr_e)\s*\(\s*\$` or `,\s*\$\w+\s*\)\s*;` closing a gettext call | Common issues: Internationalization
- Hard-coded remote JS or CSS | `(src|href)\s*=\s*["']https?://[^"']+\.(js|css)` or wp_enqueue_(script|style) with an `https?://` URL (allow fonts.googleapis.com and fonts.gstatic.com) | G8, Common issues: Calling files remotely
- Bundled core library | files named `jquery*.js`, `phpmailer*`, `class-phpass*`, `simplepie*`, `class-simplepie*` in the zip (outside vendor) | G13
- Update checker or phone-home updates | `pre_set_site_transient_update_plugins`, `site_transient_update_plugins`, `plugins_api`, or `plugin-update-checker` in plugin code | Common issues: Update checker, G8
- Changing other plugins' state | `activate_plugin\s*\(` or `deactivate_plugins\s*\(` targeting another plugin | Common issues: Changing active plugins
- Obfuscated or packed code | `eval\s*\(\s*function\s*\(\s*p,a,c,k,e` or `eval\s*\(\s*base64_decode` or `eval\s*\(\s*gzinflate` | G4
- Hidden iframe loading admin pages | `<iframe` in admin-side PHP | G8
- Unrequested credit link | `(?i)powered by` in plugin PHP or JS output | G10
- Compliance overclaim in readme or UI | `(?i)(100%|fully|guarantee[sd]?)\s+(\w+\s+)?(compliant|compliance)` in readme.txt, PHP or assets text | G9, Compliance disclaimers
- Zip is too large | zip size greater than 10 MB | Developer FAQ
- Disallowed contents in release zip | paths matching `node_modules/`, `\.git/`, `\.github/`, `tests?/`, `\.DS_Store`, `phpunit\.xml`, `\.zip$`, `\.phar$` | Common issues: Unneeded folders and Not permitted files
- Missing composer.json when vendor/ is shipped | `vendor/` present and `composer.json` absent at plugin root | Common issues: GPL composer
- Readme is markdown only | `readme.md` present with no `readme.txt` | Common issues: Incomplete readme
- Readme missing | no `readme.txt` at plugin root | Common issues: Incomplete readme
- Too many tags | `^Tags:` line with more than 4 commas in readme.txt | G12, readme.txt
- Stable tag is trunk | `^Stable tag:\s*trunk` (case-insensitive) | readme.txt, Common issues: Stable tag
- Stable tag differs from Version | readme `Stable tag:` value not equal to main-file `Version:` | Common issues: Incorrect Stable Tag
- Non-numeric Tested up to | `^Tested up to:\s*(?!\d+(\.\d+){1,2}\s*$)` | readme.txt
- Non-numeric Requires PHP | `^Requires PHP:\s*(?!\d+(\.\d+){0,2}\s*$)` | readme.txt
- Short description over 150 characters | first non-empty line after the readme header block longer than 150 characters | readme.txt
- Readme over 10 KB | readme.txt size greater than 10240 bytes | readme.txt
- License missing or mismatched | main file lacks `^\s*\*?\s*License:` header or `License:` differs from readme.txt | Common issues: License, G1
- Main file name not the folder name | basename of the file holding `Plugin Name:` differs from the plugin folder name | Common issues: Main file convention
- Main file in a trunk subfolder | `trunk/<dir>/<plugin>.php` carrying `Plugin Name:` | Subversion
- Invalid SVN tag name | directory under tags/ not matching `^[0-9]+(\.[0-9]+)*$` | Subversion
- Asset size or name problems | assets files: banner not 772x250 or 1544x500, icon not 128x128 or 256x256, banner over 4 MB, icon over 1 MB, screenshot over 10 MB, screenshot name not `^screenshot-\d+(-[a-z_A-Z]+)?\.(png|jpg)$` | Plugin assets
- Block.json missing required keys | block.json without `"name"`, `"title"`, a script or editorScript key, or a style or editorStyle key; or name starting with `core/` or `wordpress/` | Block-specific B3a, B4
- Slug begins with a reserved term | folder name matching `^(wordpress|woo)` or containing `plugin` or `wordpress` | Developer FAQ, G17
- add_role on every request | `add_role\s*\(` inside a hook other than `register_activation_hook` or guarded by get_role | Users
