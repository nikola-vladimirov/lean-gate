# WordPress, WooCommerce, Bricks and block editor work

Read this before changing code in a WordPress plugin, theme, WooCommerce extension, Bricks element or block. It applies to companion plugins and scripts too. Routing: the session hook points here for any WordPress project; the audit at release is `lean-project audit security` on the `lean-project review-scope` list.

## Contents

- 1. Read the docs in the right order
- 2. Check changelogs and version compatibility
- 3. Best practices
- 4. Security checklist
- 5. Fixes (the unsafe pattern and its replacement)
- 6. Before calling it done

## 1. Read the docs in the right order

Verify before you write. Never code from memory for a version you have not checked.

1. **The installed code is the truth.** Read the version in the site, not the newest docs: `wp-includes/version.php` (`$wp_version`), `WC()->version` or the WooCommerce plugin header, the Bricks version in its plugin header, the block's `block.json`. Read only the function or hook you need, not the whole file.
2. **Official references, in this order:**
   - WordPress functions and hooks: developer.wordpress.org (Function Reference, Hook Reference). Check the "Since" version on each function.
   - WordPress how-to: the Plugin Handbook, the Theme Handbook, the Block Editor Handbook (developer.wordpress.org/block-editor).
   - WooCommerce: developer.woocommerce.com (developer docs, Hooks, Extension guides). For HPOS, the "High-Performance Order Storage" guide.
   - Bricks: bricksbuilder.io documentation, and the Bricks source in the theme or plugin folder for element classes and filters.
   - ACF, when used: the ACF docs for the field types and the `acf/` hooks.
3. **Record what you verified** in the plan or the card note with the URL or file and line, so the next session does not repeat the search. Unofficial blog posts and AI answers are leads until checked against one of the sources above.
4. **Undocumented means unstable.** A hook or class that is not in the reference or the source of the installed version may change without notice. Prefer the documented route, or note the risk in the plan.

## 2. Check changelogs and version compatibility

- **WordPress plugin or theme:** `readme.txt` holds `Requires at least`, `Tested up to`, `Requires PHP` and the `== Changelog ==` section. Read the entries since the version the project targets. A `Tested up to` below the installed WordPress version is a compatibility risk to note.
- **WordPress core:** the release post and the Developer Notes for the version you are targeting (developer.wordpress.org/reference/since). Deprecations show up there first.
- **WooCommerce:** the release notes and the "Developer Notes" or "Upgrade Notice" for each version between the project's target and the installed one. Look especially for deprecated functions (`_deprecated_function` notices), changed hook arguments, HPOS and Store API changes, and blocks checkout changes.
- **Bricks:** the changelog on bricksbuilder.io and the version notes for element and dynamic-data changes. Check the element's own schema before you rely on a setting name; names change between versions.
- **Block editor:** `apiVersion` in `block.json` and the Gutenberg/WordPress version that introduced each block support you use.
- **Write the result down:** a one-line compatibility note in the plan (minimum WordPress, PHP, WooCommerce, Bricks) with the version you checked it against.

## 3. Best practices

**Structure and lifecycle**
- Prefix every global function, class, option, meta key, hook and CSS class with the project prefix. Use a namespace for classes.
- Hook into `init`, `plugins_loaded` or the specific hook. Do no work at file load. Use `register_activation_hook` and `register_deactivation_hook`, and an `uninstall.php` for cleanup.
- Use the Settings API for options. Pass `false` as the autoload argument for large or rarely read options (`update_option( $name, $value, false )`).
- Check dependencies before using them: `class_exists( 'WooCommerce' )`, `function_exists( 'acf_add_local_field_group' )`, or a hook on `plugins_loaded` to bail out if a required plugin is missing.

**Internationalization**
- Text domain = plugin slug, loaded with `load_plugin_textdomain` or the header. Wrap every user-visible string in `__()`, `_e()`, `esc_html__()` or `sprintf` with `_n()` for plurals.

**Assets**
- Enqueue with `wp_enqueue_script` and `wp_enqueue_style`, with a version number. Never print `<script>` tags directly. Load only where needed.

**WooCommerce**
- Read and write orders through the CRUD API (`wc_get_order`, `wc_get_orders`, `$order->get_meta()`, `$order->update_meta_data()`, `$order->save()`), never `get_post_meta` on an order, because HPOS stores orders outside `posts`.
- Declare HPOS compatibility: `\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true )` on `before_woocommerce_init`.
- Use Action Scheduler for background jobs, not raw cron.
- Never log card numbers, tokens or full payment payloads.

**Bricks**
- Element classes extend `\Bricks\Element` and declare the `name`, `category`, `icon` and `controls`. Escape everything the element renders. Treat any custom-code or HTML control as untrusted input.
- Use the dynamic-data and query APIs documented for the installed version; do not read Bricks' internal tables directly.

**Block editor**
- Register blocks from `block.json` with `register_block_type( __DIR__ . '/build' )`. Set `apiVersion` to the current value documented in the Block Editor Handbook.
- Build with `@wordpress/scripts`. Use `useBlockProps()` and `RichText` rather than raw markup. For dynamic blocks, escape in `render_callback`.

**Performance**
- Avoid unbounded queries: set `posts_per_page`, use `fields => 'ids'` when only IDs are needed, and set `no_found_rows` when pagination is not used.
- Cache expensive remote data with transients or the object cache, with an expiry.

## 4. Security checklist

Run through this for every change. At release, `lean-project audit security` on the `review-scope` list flags most of the items below as a starting point; reading the code is still required.

- **Input:** every value from `$_GET`, `$_POST`, `$_REQUEST`, `$_COOKIE`, `$_FILES`, `$_SERVER`, REST params and AJAX data is untrusted. Sanitize on the way in (`sanitize_text_field`, `absint`, `sanitize_key`, `wp_unslash` first for superglobals).
- **Output:** escape on the way out for the context: `esc_html`, `esc_attr`, `esc_url`, `esc_js`, `wp_kses_post` for trusted HTML, `esc_textarea`.
- **Authorization:** every state-changing handler checks a capability (`current_user_can( 'manage_woocommerce' )` and the like), not only "is logged in". Admin screens check the capability before rendering.
- **CSRF:** every form and AJAX action verifies a nonce (`wp_nonce_field` plus `check_admin_referer`, or `check_ajax_referer`). A nonce proves intent, not permission, so keep the capability check too.
- **REST:** every route has a real `permission_callback`. `__return_true` is only acceptable for public read-only data with no sensitive fields.
- **SQL:** build queries with `$wpdb->prepare()` (`%s`, `%d`, `%f`, `%i` for identifiers). Never concatenate request data. Use `$wpdb->esc_like()` for LIKE clauses.
- **Redirects:** use `wp_safe_redirect()` and validate the target against an allowlist.
- **Uploads:** use `wp_handle_upload()` or `wp_handle_sideload()` with an allowed MIME list. Never trust the `$_FILES` type or extension alone. Store outside executable paths or with `.htaccess` rules where needed.
- **Remote requests:** for URLs from users or settings, use `wp_safe_remote_get()` (blocks internal addresses) and validate the scheme.
- **Dangerous functions:** no `eval`, `assert`, `create_function`, `system`, `exec`, `shell_exec`, `passthru` on request or stored data. `unserialize` on untrusted data is a code-execution risk: use `json_decode` or `maybe_unserialize` only on data you wrote and trust, or pass `allowed_classes => false`.
- **Secrets:** API keys and tokens never go to JavaScript or to the page. Store them with `update_option( ..., false )`, never in a file under the web root.
- **Data exposure:** REST and AJAX responses return only the fields the caller may see. Never return password hashes, tokens or other users' data.
- **Dependencies:** run `composer audit` and `npm audit` where the project uses them. Check the WordPress plugin security advisories for the plugins and versions the project depends on.
- **JavaScript:** use `textContent` or `createElement`, not `innerHTML`, for data. Pass server data with `wp_localize_script` or `data-` attributes, escaped.

## 5. Fixes

Each row is an unsafe pattern and the replacement. Apply the fix at the source, not just on the line the audit reports.

| Unsafe | Fix |
| --- | --- |
| `echo $_GET['x'];` | `echo esc_html( sanitize_text_field( wp_unslash( $_GET['x'] ) ) );` |
| `$wpdb->query( "DELETE FROM t WHERE id = $id" )` | `$wpdb->query( $wpdb->prepare( 'DELETE FROM t WHERE id = %d', absint( $id ) ) );` |
| `add_action( 'wp_ajax_save', 'save' );` with no checks | In `save()`: `check_ajax_referer( 'save_action', 'nonce' );` then `if ( ! current_user_can( 'edit_posts' ) ) { wp_send_json_error( null, 403 ); }` |
| `register_rest_route( ..., [ 'permission_callback' => '__return_true' ] )` on a write route | `'permission_callback' => fn () => current_user_can( 'manage_options' )` |
| `update_option( 'k', $_POST['k'] );` | `update_option( 'k', sanitize_text_field( wp_unslash( $_POST['k'] ) ), false );` |
| `wp_redirect( $_GET['next'] );` | `wp_safe_redirect( $url );` with `$url` checked against an allowlist |
| `eval( $_POST['code'] );` | Remove. Use a fixed set of allowed actions. |
| `unserialize( $_COOKIE['d'] );` | `json_decode( wp_unslash( $_COOKIE['d'] ), true );` with a schema check |
| `include $_GET['page'] . '.php';` | Map the value to a fixed file from an allowlist. |
| `$file = $_FILES['f']; move_uploaded_file( ... );` | `wp_handle_upload( $_FILES['f'], [ 'test_form' => false, 'mimes' => $allowed ] );` |
| `wp_remote_get( $_POST['url'] );` | `wp_safe_remote_get( esc_url_raw( $url ) );` |
| `el.innerHTML = data;` | `el.textContent = data;` |
| `echo '<script>var k = "' . $key . '";</script>';` | `wp_localize_script( 'handle', 'myData', [ 'key' => $key ] );` |
| `$order = get_post_meta( $order_id, 'x', true );` | `$order = wc_get_order( $order_id ); $order->get_meta( 'x' );` |

After each fix, re-run `lean-project audit security` on the affected files and confirm the line no longer appears, then read the surrounding code once more. The tool is a heuristic: it finds lines to check, and a clean run does not prove the code is safe.

## 6. Before calling it done

- The plan or card records the versions checked and the docs used (section 1), with URLs or file references.
- The changelog check (section 2) is written down: minimum WordPress, PHP, WooCommerce and Bricks versions.
- At release: `lean-project audit security` has been run on the `review-scope` list, and every finding was either fixed or explained.
- For WordPress or WooCommerce performance or HPOS risk, `lean-project audit perf` has been run on the same list; CRITICAL hits are fixed or explained before the card is `done`. Deeper audits go to the `wp-woo-performance-audit` skill.
- `php -l` and `lean-project check gate <card>` pass for the changed PHP files.
- For Bricks, WooCommerce checkout or block changes, the change has been tested in the real builder or site, not only in a mock (see the project's own testing rules).
