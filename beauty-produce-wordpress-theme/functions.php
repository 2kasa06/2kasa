<?php
/**
 * Beauty Produce テーマの機能定義。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'BP_THEME_VERSION', '2.0.0' );

/** ライフステージ別ページの初期定義。 */
function bp_age_definitions() {
	return array(
		'teens' => array(
			'title'  => '10代〜20代',
			'en'     => 'Teens & Twenties',
			'concept'=> '垢抜けて、自分らしく輝く',
			'image'  => 'age-teens.webp',
			'accent' => 'hsl(340, 50%, 80%)',
		),
		'thirties' => array(
			'title'  => '30代',
			'en'     => 'Thirties',
			'concept'=> '自信をまとい、美しさを再定義する',
			'image'  => 'age-30s.webp',
			'accent' => 'hsl(8, 40%, 72%)',
		),
		'forties' => array(
			'title'  => '40代',
			'en'     => 'Forties',
			'concept'=> '本当にやりたい自分を見つける',
			'image'  => 'age-40s.webp',
			'accent' => 'hsl(30, 35%, 68%)',
		),
		'fifties' => array(
			'title'  => '50代〜60代',
			'en'     => 'Fifties & Beyond',
			'concept'=> '今の魅力を、最大限に輝かせる',
			'image'  => 'age-50s.webp',
			'accent' => 'hsl(215, 28%, 72%)',
		),
	);
}

/* ============================================================
   テーマセットアップ
   ============================================================ */

function bp_setup() {
	load_theme_textdomain( 'beauty-produce', get_template_directory() . '/languages' );

	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'automatic-feed-links' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'custom-logo', array( 'height' => 96, 'width' => 96, 'flex-height' => true, 'flex-width' => true ) );
	add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script' ) );

	register_nav_menus( array( 'primary' => __( 'ヘッダーメニュー', 'beauty-produce' ) ) );
}
add_action( 'after_setup_theme', 'bp_setup' );

function bp_enqueue_assets() {
	wp_enqueue_style(
		'bp-google-fonts',
		'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Noto+Sans+JP:wght@300;400;500;700&family=Noto+Serif+JP:wght@300;400;500&display=swap',
		array(),
		null
	);

	wp_enqueue_style( 'bp-style', get_stylesheet_uri(), array( 'bp-google-fonts' ), BP_THEME_VERSION );

	wp_enqueue_script( 'bp-theme', get_template_directory_uri() . '/assets/js/theme.js', array(), BP_THEME_VERSION, true );
}
add_action( 'wp_enqueue_scripts', 'bp_enqueue_assets' );

function bp_resource_hints( $urls, $relation_type ) {
	if ( 'preconnect' === $relation_type ) {
		$urls[] = array( 'href' => 'https://fonts.googleapis.com' );
		$urls[] = array( 'href' => 'https://fonts.gstatic.com', 'crossorigin' );
	}
	return $urls;
}
add_filter( 'wp_resource_hints', 'bp_resource_hints', 10, 2 );

/* ============================================================
   カスタム投稿タイプ
   ============================================================ */

function bp_register_post_types() {
	$types = array(
		'bp_service' => array(
			'name'      => __( 'サービス', 'beauty-produce' ),
			'menu_icon' => 'dashicons-heart',
			'position'  => 21,
		),
		'bp_before_after' => array(
			'name'      => __( 'ビフォーアフター', 'beauty-produce' ),
			'menu_icon' => 'dashicons-image-flip-horizontal',
			'position'  => 22,
		),
		'bp_testimonial' => array(
			'name'      => __( 'お客様の声', 'beauty-produce' ),
			'menu_icon' => 'dashicons-format-quote',
			'position'  => 23,
		),
		'bp_faq' => array(
			'name'      => __( 'よくあるご質問', 'beauty-produce' ),
			'menu_icon' => 'dashicons-editor-help',
			'position'  => 24,
		),
	);

	foreach ( $types as $slug => $config ) {
		register_post_type(
			$slug,
			array(
				'labels' => array(
					'name'          => $config['name'],
					'singular_name' => $config['name'],
					/* translators: %s: 投稿タイプ名 */
					'add_new_item'  => sprintf( __( '%sを追加', 'beauty-produce' ), $config['name'] ),
					/* translators: %s: 投稿タイプ名 */
					'edit_item'     => sprintf( __( '%sを編集', 'beauty-produce' ), $config['name'] ),
				),
				'public'        => false,
				'show_ui'       => true,
				'show_in_menu'  => true,
				'menu_icon'     => $config['menu_icon'],
				'menu_position' => $config['position'],
				'supports'      => array( 'title', 'editor', 'page-attributes', 'thumbnail' ),
				'has_archive'   => false,
			)
		);
	}
}
add_action( 'init', 'bp_register_post_types' );

/* ============================================================
   メタボックス
   ============================================================ */

function bp_add_meta_boxes() {
	add_meta_box( 'bp_service_fields', __( 'サービス：編集項目', 'beauty-produce' ), 'bp_render_service_meta_box', 'bp_service', 'normal', 'high' );
	add_meta_box( 'bp_ba_fields', __( 'ビフォーアフター：編集項目', 'beauty-produce' ), 'bp_render_ba_meta_box', 'bp_before_after', 'normal', 'high' );
	add_meta_box( 'bp_voice_fields', __( 'お客様の声：編集項目', 'beauty-produce' ), 'bp_render_voice_meta_box', 'bp_testimonial', 'normal', 'high' );
	add_meta_box( 'bp_age_fields', __( 'ライフステージページ：編集項目', 'beauty-produce' ), 'bp_render_age_meta_box', 'page', 'normal', 'high' );
}
add_action( 'add_meta_boxes', 'bp_add_meta_boxes' );

function bp_field_row( $label, $name, $value, $description = '', $type = 'text' ) {
	echo '<p style="margin:0 0 1.25em;">';
	echo '<label for="' . esc_attr( $name ) . '" style="display:block;font-weight:600;margin-bottom:.35em;">' . esc_html( $label ) . '</label>';

	if ( 'textarea' === $type ) {
		echo '<textarea id="' . esc_attr( $name ) . '" name="' . esc_attr( $name ) . '" rows="6" style="width:100%;">' . esc_textarea( $value ) . '</textarea>';
	} else {
		echo '<input type="text" id="' . esc_attr( $name ) . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( $value ) . '" style="width:100%;" />';
	}

	if ( $description ) {
		echo '<span class="description" style="display:block;margin-top:.35em;">' . esc_html( $description ) . '</span>';
	}
	echo '</p>';
}

function bp_render_service_meta_box( $post ) {
	wp_nonce_field( 'bp_save_meta', 'bp_meta_nonce' );
	bp_field_row( 'アイコン（絵文字1つ）', 'bp_icon', get_post_meta( $post->ID, 'bp_icon', true ), '例：🎨 ✦ 👗 💄 💎 🌿 📸 🌟' );
	echo '<p class="description">サービスの説明文は上の本文欄に入力してください。並び順は「ページ属性 → 順序」で変更できます。</p>';
}

function bp_render_ba_meta_box( $post ) {
	wp_nonce_field( 'bp_save_meta', 'bp_meta_nonce' );
	bp_field_row( 'Before画像のURL', 'bp_before_image', get_post_meta( $post->ID, 'bp_before_image', true ), 'メディアライブラリにアップロードした画像のURLを貼り付けてください。' );
	bp_field_row( 'After画像のURL（任意）', 'bp_after_image', get_post_meta( $post->ID, 'bp_after_image', true ), '通常はアイキャッチ画像がAfterとして使われます。アイキャッチを使わない場合のみ入力してください。' );
	echo '<p class="description">タイトルがラベル（例：ファッション提案）、本文が説明文として表示されます。掲載許可をいただいた画像のみご使用ください。</p>';
}

function bp_render_voice_meta_box( $post ) {
	wp_nonce_field( 'bp_save_meta', 'bp_meta_nonce' );
	bp_field_row( '年齢（例：28歳）', 'bp_voice_age', get_post_meta( $post->ID, 'bp_voice_age', true ) );
	bp_field_row( '利用サービス（例：骨格診断 + ファッションアテンド）', 'bp_voice_service', get_post_meta( $post->ID, 'bp_voice_service', true ) );
	bp_field_row( '評価（1〜5）', 'bp_voice_rating', get_post_meta( $post->ID, 'bp_voice_rating', true ), '星の数として表示されます。未入力の場合は5になります。' );
	echo '<p class="description">タイトルがお名前の表記（例：S.K様）、本文がご感想として表示されます。実際に許諾を得た感想のみ登録してください。</p>';
}

function bp_render_age_meta_box( $post ) {
	wp_nonce_field( 'bp_save_meta', 'bp_meta_nonce' );

	if ( 'page-stage.php' !== get_page_template_slug( $post->ID ) ) {
		echo '<p>この項目は、右側の「ページ属性 → テンプレート」で <strong>ライフステージ別ページ</strong> を選んだときに使われます。</p>';
	}

	bp_field_row( '英字ラベル（例：Thirties）', 'bp_age_en', get_post_meta( $post->ID, 'bp_age_en', true ) );
	bp_field_row( '年代の表記（例：30代）', 'bp_age_range', get_post_meta( $post->ID, 'bp_age_range', true ), '未入力の場合はページタイトルが使われます。' );
	bp_field_row( 'キャッチコピー', 'bp_age_tagline', get_post_meta( $post->ID, 'bp_age_tagline', true ), 'ヒーローに大きく斜体で表示されます。トップの年代カードにも使われます。' );
	bp_field_row( 'ヒーローの説明文', 'bp_age_description', get_post_meta( $post->ID, 'bp_age_description', true ), '', 'textarea' );
	bp_field_row( 'お悩みセクションの見出し', 'bp_age_concept', get_post_meta( $post->ID, 'bp_age_concept', true ) );
	bp_field_row( 'お悩みセクションの説明文', 'bp_age_subconcept', get_post_meta( $post->ID, 'bp_age_subconcept', true ), '', 'textarea' );
	bp_field_row( 'こんなお悩みはありませんか？', 'bp_age_painpoints', get_post_meta( $post->ID, 'bp_age_painpoints', true ), '1行につき1件を入力してください。', 'textarea' );
	bp_field_row( 'シーン別スタイリング', 'bp_age_scenes', get_post_meta( $post->ID, 'bp_age_scenes', true ), '1行につき1件。「見出し | 説明文」の形式で入力してください。', 'textarea' );
	bp_field_row( 'アクセントカラー', 'bp_age_accent', get_post_meta( $post->ID, 'bp_age_accent', true ), '例：hsl(8, 40%, 72%) — 背景の光のにじみに使われます。' );

	$selected = (array) get_post_meta( $post->ID, 'bp_age_services', true );
	$services = get_posts( array( 'post_type' => 'bp_service', 'posts_per_page' => -1, 'orderby' => array( 'menu_order' => 'ASC', 'date' => 'ASC' ) ) );

	echo '<p style="margin:0 0 .35em;font-weight:600;">このステージで紹介するサービス</p>';
	if ( $services ) {
		echo '<ul style="margin:0 0 1em;column-count:2;">';
		foreach ( $services as $service ) {
			printf(
				'<li><label><input type="checkbox" name="bp_age_services[]" value="%1$d" %2$s /> %3$s</label></li>',
				(int) $service->ID,
				checked( in_array( (string) $service->ID, array_map( 'strval', $selected ), true ), true, false ),
				esc_html( $service->post_title )
			);
		}
		echo '</ul>';
	} else {
		echo '<p class="description">サービスがまだ登録されていません。左メニューの「サービス」から追加してください。</p>';
	}

	echo '<p class="description">ヒーローのイラストは「アイキャッチ画像」に設定します。</p>';
}

function bp_save_meta( $post_id ) {
	if ( ! isset( $_POST['bp_meta_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['bp_meta_nonce'] ) ), 'bp_save_meta' ) ) {
		return;
	}
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}
	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}

	$text_fields = array(
		'bp_icon',
		'bp_voice_age',
		'bp_voice_service',
		'bp_voice_rating',
		'bp_age_en',
		'bp_age_range',
		'bp_age_tagline',
		'bp_age_concept',
		'bp_age_accent',
	);
	foreach ( $text_fields as $field ) {
		if ( isset( $_POST[ $field ] ) ) {
			update_post_meta( $post_id, $field, sanitize_text_field( wp_unslash( $_POST[ $field ] ) ) );
		}
	}

	foreach ( array( 'bp_before_image', 'bp_after_image' ) as $field ) {
		if ( isset( $_POST[ $field ] ) ) {
			update_post_meta( $post_id, $field, esc_url_raw( wp_unslash( $_POST[ $field ] ) ) );
		}
	}

	foreach ( array( 'bp_age_description', 'bp_age_subconcept', 'bp_age_painpoints', 'bp_age_scenes' ) as $field ) {
		if ( isset( $_POST[ $field ] ) ) {
			update_post_meta( $post_id, $field, sanitize_textarea_field( wp_unslash( $_POST[ $field ] ) ) );
		}
	}

	if ( isset( $_POST['bp_age_services'] ) ) {
		update_post_meta( $post_id, 'bp_age_services', array_map( 'absint', (array) wp_unslash( $_POST['bp_age_services'] ) ) );
	} elseif ( isset( $_POST['bp_age_en'] ) ) {
		update_post_meta( $post_id, 'bp_age_services', array() );
	}
}
add_action( 'save_post', 'bp_save_meta' );

/* ============================================================
   カスタマイザー
   ============================================================ */

function bp_customize_register( $wp_customize ) {
	$wp_customize->add_section( 'bp_basic', array( 'title' => __( 'Beauty Produce：基本情報', 'beauty-produce' ), 'priority' => 20 ) );

	$settings = array(
		'bp_brand_name'  => array( 'label' => 'ブランド名 1行目', 'default' => 'Beauty' ),
		'bp_brand_sub'   => array( 'label' => 'ブランド名 2行目', 'default' => 'Produce' ),
		'bp_eyebrow'     => array( 'label' => 'トップの小見出し', 'default' => 'Beauty Produce' ),
		'bp_hero_title'  => array( 'label' => 'トップの大見出し', 'default' => "あなたらしい美しさを、\nもっと自由に。", 'type' => 'textarea', 'description' => '2行目は自動で色が変わります。改行で分けてください。' ),
		'bp_hero_lead'   => array( 'label' => 'トップのメッセージ', 'default' => '人生のステージごとに変化する美しさ・自信・魅力に寄り添う、あなただけの美容プロデュースサービス。', 'type' => 'textarea' ),
		'bp_stat1_num'   => array( 'label' => '実績① 数値', 'default' => '1,200+' ),
		'bp_stat1_label' => array( 'label' => '実績① ラベル', 'default' => '累計お客様数' ),
		'bp_stat2_num'   => array( 'label' => '実績② 数値', 'default' => '98%' ),
		'bp_stat2_label' => array( 'label' => '実績② ラベル', 'default' => '満足度' ),
		'bp_stat3_num'   => array( 'label' => '実績③ 数値', 'default' => '10年+' ),
		'bp_stat3_label' => array( 'label' => '実績③ ラベル', 'default' => '実績' ),
		'bp_brand_head'  => array( 'label' => 'ブランドメッセージ見出し', 'default' => "美容サロンではなく、\n「人生をアップデートするブランド」", 'type' => 'textarea', 'description' => '2行目は自動で色が変わります。改行で分けてください。' ),
		'bp_brand_body'  => array( 'label' => 'ブランドメッセージ本文', 'default' => "自分に本当に似合うものを知り、自分自身をアップデートする体験。\n外見だけでなく、内側から湧き出る自信と魅力を育みます。", 'type' => 'textarea' ),
		'bp_ornament'    => array( 'label' => 'ブランドメッセージの飾り文字', 'default' => 'Your Story Begins Here' ),
		'bp_tel'         => array( 'label' => '電話番号', 'default' => '' ),
		'bp_email'       => array( 'label' => 'メールアドレス', 'default' => '' ),
		'bp_instagram'   => array( 'label' => 'InstagramのURL', 'default' => '', 'type' => 'url' ),
		'bp_reserve_url' => array( 'label' => '予約ページURL', 'default' => '', 'type' => 'url', 'description' => '外部の予約サービスを使う場合に入力します。空欄のときはページ内の予約フォームへ移動します。' ),
	);

	foreach ( $settings as $key => $config ) {
		$type = isset( $config['type'] ) ? $config['type'] : 'text';

		$wp_customize->add_setting(
			$key,
			array(
				'default'           => $config['default'],
				'sanitize_callback' => 'url' === $type ? 'esc_url_raw' : ( 'textarea' === $type ? 'sanitize_textarea_field' : 'sanitize_text_field' ),
				'transport'         => 'refresh',
			)
		);

		$wp_customize->add_control(
			$key,
			array(
				'label'       => $config['label'],
				'section'     => 'bp_basic',
				'type'        => 'url' === $type ? 'url' : $type,
				'description' => isset( $config['description'] ) ? $config['description'] : '',
			)
		);
	}

	$wp_customize->add_setting( 'bp_hero_image', array( 'default' => '', 'sanitize_callback' => 'esc_url_raw' ) );
	$wp_customize->add_control(
		new WP_Customize_Image_Control(
			$wp_customize,
			'bp_hero_image',
			array(
				'label'       => __( 'メインイラスト', 'beauty-produce' ),
				'section'     => 'bp_basic',
				'description' => __( '未設定の場合はテーマ同梱のイラストが表示されます。', 'beauty-produce' ),
			)
		)
	);
}
add_action( 'customize_register', 'bp_customize_register' );

/* ============================================================
   ヘルパー
   ============================================================ */

function bp_option( $key, $default = '' ) {
	$value = get_theme_mod( $key, $default );
	return '' === $value || false === $value ? $default : $value;
}

function bp_asset_image( $file ) {
	return get_template_directory_uri() . '/assets/images/' . $file;
}

/** 改行区切りのテキストを配列にします。 */
function bp_parse_list( $raw ) {
	$items = array();
	foreach ( preg_split( '/\r\n|\r|\n/', (string) $raw ) as $line ) {
		$line = trim( $line );
		if ( '' !== $line ) {
			$items[] = $line;
		}
	}
	return $items;
}

/** 「見出し | 説明」形式のテキストを配列にします。 */
function bp_parse_pairs( $raw ) {
	$items = array();
	foreach ( bp_parse_list( $raw ) as $line ) {
		$parts   = array_map( 'trim', explode( '|', $line, 2 ) );
		$items[] = array(
			'title' => $parts[0],
			'body'  => isset( $parts[1] ) ? $parts[1] : '',
		);
	}
	return $items;
}

/** 2行のテキストを「1行目」「2行目（強調）」に分けます。 */
function bp_split_lines( $raw ) {
	$lines = bp_parse_list( $raw );
	return array(
		'first' => isset( $lines[0] ) ? $lines[0] : '',
		'em'    => isset( $lines[1] ) ? $lines[1] : '',
	);
}

function bp_reserve_link() {
	$url = bp_option( 'bp_reserve_url' );
	return $url ? $url : home_url( '/#booking' );
}

/** ライフステージ別ページ（page-stage.php）の一覧。 */
function bp_get_age_pages() {
	return get_posts(
		array(
			'post_type'      => 'page',
			'posts_per_page' => -1,
			'post_status'    => 'publish',
			'meta_key'       => '_wp_page_template',
			'meta_value'     => 'page-stage.php',
			'orderby'        => array( 'menu_order' => 'ASC', 'date' => 'ASC' ),
		)
	);
}

/** ステージページのイラストURL（アイキャッチ → スラッグ既定 → ヒーロー既定）。 */
function bp_age_image_url( $page_id ) {
	if ( has_post_thumbnail( $page_id ) ) {
		return get_the_post_thumbnail_url( $page_id, 'full' );
	}

	$defs = bp_age_definitions();
	$slug = get_post_field( 'post_name', $page_id );

	return isset( $defs[ $slug ] ) ? bp_asset_image( $defs[ $slug ]['image'] ) : bp_asset_image( 'hero-illustration.webp' );
}

/** 星印を出力します。 */
function bp_stars( $rating ) {
	$rating = max( 1, min( 5, (int) $rating ) );
	$out    = '';
	for ( $i = 0; $i < $rating; $i++ ) {
		$out .= '★';
	}
	return $out;
}

/* ============================================================
   初期サンプルデータ
   ============================================================ */

function bp_seed_post( $post_type, $title, $content, $meta = array(), $order = 0 ) {
	$existing = get_posts( array( 'post_type' => $post_type, 'title' => $title, 'posts_per_page' => 1, 'post_status' => 'any' ) );

	if ( $existing ) {
		return (int) $existing[0]->ID;
	}

	$post_id = wp_insert_post(
		array(
			'post_type'    => $post_type,
			'post_title'   => $title,
			'post_content' => $content,
			'post_status'  => 'publish',
			'menu_order'   => $order,
		)
	);

	if ( ! $post_id || is_wp_error( $post_id ) ) {
		return 0;
	}

	foreach ( $meta as $key => $value ) {
		update_post_meta( $post_id, $key, $value );
	}

	return (int) $post_id;
}

function bp_seed_demo_content() {
	if ( get_option( 'bp_demo_seeded' ) ) {
		$map = array();
		foreach ( get_posts( array( 'post_type' => 'bp_service', 'posts_per_page' => -1, 'post_status' => 'any' ) ) as $post ) {
			$map[ $post->post_title ] = (int) $post->ID;
		}
		return $map;
	}

	$services = array(
		array( '🎨', 'パーソナルカラー診断', 'あなたを最も輝かせる色を科学的に分析' ),
		array( '✦', '骨格診断', '体型の特徴を活かすスタイリングを提案' ),
		array( '👗', 'ファッションアテンド', '実際のショッピングに同行してサポート' ),
		array( '💄', 'コスメアテンド', '肌に合ったコスメを一緒に選びます' ),
		array( '💎', 'アクセサリー提案', '全体のコーデを完成させる小物選び' ),
		array( '🌿', 'ライフスタイル提案', '美しさを日常に取り入れる生活提案' ),
		array( '📸', 'ビフォーアフター撮影', '変化の記録を美しく残します' ),
		array( '🌟', 'プロカメラマン撮影', '新しいあなたをプロが撮影します' ),
	);

	$service_ids = array();
	foreach ( $services as $index => $service ) {
		$service_ids[ $service[1] ] = bp_seed_post( 'bp_service', $service[1], $service[2], array( 'bp_icon' => $service[0] ), $index + 1 );
	}

	$faqs = array(
		array( '初めてでも大丈夫ですか？', 'はい、もちろんです。美容に詳しくない方や、何から始めればいいかわからない方こそ、ぜひご相談ください。無料カウンセリングで丁寧にお話を伺います。' ),
		array( '診断の所要時間はどのくらいですか？', 'パーソナルカラー診断・骨格診断は各90〜120分程度です。トータルプロデュースコースは複数回に分けて行うことが多く、お客様のご希望に合わせてスケジュールを組みます。' ),
		array( 'オンラインでの対応は可能ですか？', 'カウンセリングや一部の相談はオンラインでも対応しております。ただし、パーソナルカラー診断・骨格診断は対面での実施を推奨しております。' ),
		array( '料金はどのくらいかかりますか？', 'サービス内容によって異なります。パーソナルカラー診断単体は¥15,000〜、トータルプロデュースコースは¥50,000〜となっております。詳しくはお問い合わせください。' ),
		array( '男性でも利用できますか？', '現在は女性のお客様を対象としたサービスを提供しております。将来的には男性向けサービスも検討しております。' ),
		array( 'プレゼントとして利用できますか？', 'はい、ギフト券のご用意もございます。大切な方への特別なプレゼントとしてもご利用いただけます。' ),
	);
	foreach ( $faqs as $index => $faq ) {
		bp_seed_post( 'bp_faq', $faq[0], $faq[1], array(), $index + 1 );
	}

	$voices = array(
		array( 'S.K様', '28歳', '骨格診断 + ファッションアテンド', '何を着ても似合わないと思っていたのに、骨格診断で自分のタイプを知ってから、毎日のコーデが楽しくなりました。鏡を見るのが好きになれたことが一番の変化です。' ),
		array( 'M.T様', '35歳', 'パーソナルカラー診断 + コスメアテンド', '仕事でもプライベートでも「なんか垢抜けたね」と言われるようになりました。パーソナルカラー診断で似合う色を知ったことで、買い物の失敗がなくなりました。' ),
		array( 'Y.N様', '43歳', 'トータルプロデュース', '40代になって何が自分に似合うのかわからなくなっていました。トータルプロデュースを受けて、今の自分に合ったスタイルを見つけられた気がします。' ),
		array( 'K.H様', '55歳', 'コスメ見直し + 撮影体験', '長年使い続けていたコスメを見直すきっかけになりました。今の自分の魅力を最大限に引き出してもらえて、写真撮影も楽しかったです。' ),
		array( 'R.A様', '22歳', '顔タイプ分析 + メイク提案', 'SNSで見た垢抜けたい気持ちで申し込みました。自分の顔タイプを知って、メイクの方向性がわかったことで自信がつきました！' ),
		array( 'E.M様', '38歳', 'ハイブランド導入サポート', 'ハイブランド導入サポートで初めて高級バッグを購入しました。自分への投資の仕方がわかって、毎日が豊かになった気がします。' ),
	);
	foreach ( $voices as $index => $voice ) {
		bp_seed_post(
			'bp_testimonial',
			$voice[0],
			$voice[3],
			array(
				'bp_voice_age'     => $voice[1],
				'bp_voice_service' => $voice[2],
				'bp_voice_rating'  => '5',
			),
			$index + 1
		);
	}

	$cases = array(
		array( 'ファッション提案', '骨格診断×パーソナルカラーで、本当に似合う一着を発見' ),
		array( 'メイクアップ提案', '自分の魅力を最大限に引き出すメイクへアップデート' ),
		array( 'スタイリング全体', 'トータルプロデュースで、自信に満ちた新しい自分へ' ),
	);
	foreach ( $cases as $index => $case ) {
		bp_seed_post( 'bp_before_after', $case[0], $case[1], array( 'bp_before_image' => '', 'bp_after_image' => '' ), $index + 1 );
	}

	update_option( 'bp_demo_seeded', 1 );

	return $service_ids;
}

/** ステージページのサンプル文章。 */
function bp_age_seed_content() {
	return array(
		'teens' => array(
			'concept'    => '「似合う」がわからないまま、なんとなく選んでいませんか',
			'subconcept' => '情報があふれる時代だからこそ、自分の軸を知ることが近道になります。流行を追うのではなく、流行を使いこなす側へ。',
			'description'=> '似合う色、似合う形、似合うメイク。自分の魅力を言葉にできるようになると、毎日の選択が驚くほど軽くなります。はじめての方に寄り添って、一緒に見つけていきます。',
			'painpoints' => "SNSで見たメイクを真似しても、なぜか自分には似合わない\n何を着ればいいかわからず、いつも同じ服を選んでしまう\n就活やバイトの面接で、きちんとした印象を作りたい\n限られた予算で失敗せずに買い物をしたい\n自分に自信が持てず、写真に写るのが苦手",
			'scenes'     => "就活・面接 | 清潔感と誠実さが伝わる配色と髪型に整えます。\n成人式・卒業式 | 一生残る一日を、いちばん似合う姿で迎えるために。\nデート | 背伸びしない、いつもの延長で可愛く見えるスタイルへ。\n友達との旅行 | 写真に残る場面で、自然に映える組み合わせを。",
			'services'   => array( 'パーソナルカラー診断', '骨格診断', 'ファッションアテンド', 'コスメアテンド' ),
		),
		'thirties' => array(
			'concept'    => '20代と同じ選び方では、しっくりこなくなる時期です',
			'subconcept' => '仕事も暮らしも役割が増えるほど、迷う時間はもったいない。自分の基準を一度つくれば、毎朝の選択が驚くほど速くなります。',
			'description'=> '似合うものが変わるのは、あなたが変わった証拠です。今の自分にふさわしい質感と余白を選び直して、仕事もプライベートも無理なく成立する装いへ。',
			'painpoints' => "20代の頃に似合っていた服が、急に浮いて見えるようになった\n朝、着る服を決めるのに時間がかかってしまう\n仕事着と普段着が分断していて、服が増える一方\nきちんと感を出したいのに、地味になってしまう\n自分にお金と時間を使うことに、少し迷いがある",
			'scenes'     => "オフィス・商談 | 信頼感が伝わる配色とシルエットを選びます。\n保護者会・入園式 | 浮かず、地味すぎず。場に馴染む上品さを。\n友人の結婚式 | 手持ちを活かす小物合わせまでご提案します。\n週末のおでかけ | 動きやすさと今っぽさを両立させる休日の型。",
			'services'   => array( 'パーソナルカラー診断', '骨格診断', 'コスメアテンド', 'アクセサリー提案' ),
		),
		'forties' => array(
			'concept'    => '似合うものより、着たいものを選べていますか',
			'subconcept' => '若く見せることでも、年齢に合わせて抑えることでもなく。積み重ねてきた時間が、いちばん似合う装いに変わります。',
			'description'=> '何を着ても少し野暮ったく見えるとしたら、原因は色と素材のわずかなズレかもしれません。今のご自身に合う配分を見つけ直して、装いをもっと自由にしていきます。',
			'painpoints' => "クローゼットは多いのに、着ていく服がないと感じる\n髪と肌の変化に、いつものメイクが追いつかない\n若作りにも老け見えにもしたくないが、加減がわからない\n人に会う予定が増えたのに、勝負服がない\n自分らしさを取り戻したいが、何から始めればいいか迷う",
			'scenes'     => "プレゼン・面談 | 落ち着きと明るさを両立する顔まわりの色に。\n学校行事 | 写真に残ることを前提に、明るく上品な一式を。\n同窓会・会食 | 久しぶりに会う人に、印象を更新してもらう装い。\n旅行・観劇 | 長時間でも疲れない素材で、きちんと感のある服を。",
			'services'   => array( '骨格診断', 'コスメアテンド', 'アクセサリー提案', 'ビフォーアフター撮影' ),
		),
		'fifties' => array(
			'concept'    => 'これからの時間を、いちばん好きな自分で過ごすために',
			'subconcept' => '子育てや仕事がひと段落し、自分のために時間を使えるようになる時期。似合うものを絞り込むほど、毎日は軽やかになります。',
			'description'=> '髪色が変われば、似合う色も変わります。今のご自身をあらためて診断して、これから増える予定に合わせたワードローブへ。手放すことから始める、いちばん自由な年代です。',
			'painpoints' => "白髪や肌の変化に、これまでの服の色が合わなくなってきた\n気づくと暗い色ばかりを選んでしまう\nクローゼットを整理したいが、残す基準がわからない\n新しい趣味や集まりに、着ていく服がない\n長年使い続けているコスメを、そろそろ見直したい",
			'scenes'     => "お稽古・サークル | 動きやすさと品のよさを兼ねた、通いやすい装い。\n記念写真 | 節目の日にふさわしい、華やかで落ち着いた一式を。\n旅行 | 少ない枚数で着回せる、荷物の軽い組み合わせに。\n日常のお買い物 | 普段こそ気持ちが上がる、無理のない色使いを。",
			'services'   => array( 'パーソナルカラー診断', 'コスメアテンド', 'ライフスタイル提案', 'プロカメラマン撮影' ),
		),
	);
}

/* ============================================================
   有効化時の初期ページ生成
   ============================================================ */

function bp_create_initial_pages() {
	$service_ids = bp_seed_demo_content();
	$age_seeds   = bp_age_seed_content();

	$front = get_page_by_path( 'home' );
	if ( ! $front ) {
		$front_id = wp_insert_post(
			array(
				'post_title'  => 'ホーム',
				'post_name'   => 'home',
				'post_status' => 'publish',
				'post_type'   => 'page',
			)
		);
	} else {
		$front_id = $front->ID;
	}

	if ( $front_id && ! is_wp_error( $front_id ) ) {
		update_option( 'show_on_front', 'page' );
		update_option( 'page_on_front', $front_id );
	}

	$order = 1;
	foreach ( bp_age_definitions() as $slug => $def ) {
		$page = get_page_by_path( $slug );

		if ( ! $page ) {
			$page_id = wp_insert_post(
				array(
					'post_title'  => $def['title'],
					'post_name'   => $slug,
					'post_status' => 'publish',
					'post_type'   => 'page',
					'menu_order'  => $order,
				)
			);
		} else {
			$page_id = $page->ID;
		}

		if ( ! $page_id || is_wp_error( $page_id ) ) {
			continue;
		}

		update_post_meta( $page_id, '_wp_page_template', 'page-stage.php' );

		if ( '' === get_post_meta( $page_id, 'bp_age_en', true ) ) {
			update_post_meta( $page_id, 'bp_age_en', $def['en'] );
			update_post_meta( $page_id, 'bp_age_range', $def['title'] );
			update_post_meta( $page_id, 'bp_age_tagline', $def['concept'] );
			update_post_meta( $page_id, 'bp_age_accent', $def['accent'] );

			if ( isset( $age_seeds[ $slug ] ) ) {
				$seed = $age_seeds[ $slug ];
				update_post_meta( $page_id, 'bp_age_concept', $seed['concept'] );
				update_post_meta( $page_id, 'bp_age_subconcept', $seed['subconcept'] );
				update_post_meta( $page_id, 'bp_age_description', $seed['description'] );
				update_post_meta( $page_id, 'bp_age_painpoints', $seed['painpoints'] );
				update_post_meta( $page_id, 'bp_age_scenes', $seed['scenes'] );

				$ids = array();
				foreach ( $seed['services'] as $title ) {
					if ( ! empty( $service_ids[ $title ] ) ) {
						$ids[] = (int) $service_ids[ $title ];
					}
				}
				if ( $ids ) {
					update_post_meta( $page_id, 'bp_age_services', $ids );
				}
			}
		}

		$order++;
	}

	flush_rewrite_rules();
}
add_action( 'after_switch_theme', 'bp_create_initial_pages' );

/* ============================================================
   予約・お問い合わせフォーム
   ============================================================ */

function bp_handle_contact() {
	$redirect = wp_get_referer() ? wp_get_referer() : home_url( '/' );

	if ( ! isset( $_POST['bp_contact_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['bp_contact_nonce'] ) ), 'bp_contact' ) ) {
		wp_safe_redirect( add_query_arg( 'bp_contact', 'error', $redirect ) . '#booking' );
		exit;
	}

	// ハニーポット（人間には見えない項目。入力があれば送信しない）
	if ( ! empty( $_POST['bp_website'] ) ) {
		wp_safe_redirect( add_query_arg( 'bp_contact', 'sent', $redirect ) . '#booking' );
		exit;
	}

	$name    = isset( $_POST['bp_name'] ) ? sanitize_text_field( wp_unslash( $_POST['bp_name'] ) ) : '';
	$email   = isset( $_POST['bp_email'] ) ? sanitize_email( wp_unslash( $_POST['bp_email'] ) ) : '';
	$phone   = isset( $_POST['bp_phone'] ) ? sanitize_text_field( wp_unslash( $_POST['bp_phone'] ) ) : '';
	$service = isset( $_POST['bp_service'] ) ? sanitize_text_field( wp_unslash( $_POST['bp_service'] ) ) : '';
	$message = isset( $_POST['bp_message'] ) ? sanitize_textarea_field( wp_unslash( $_POST['bp_message'] ) ) : '';

	if ( '' === $name || ! is_email( $email ) ) {
		wp_safe_redirect( add_query_arg( 'bp_contact', 'invalid', $redirect ) . '#booking' );
		exit;
	}

	$to      = get_option( 'admin_email' );
	$subject = sprintf( '[%s] ご予約・お問い合わせがありました', wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ) );
	$body    = implode(
		"\n",
		array(
			'お名前： ' . $name,
			'メールアドレス： ' . $email,
			'電話番号： ' . ( $phone ? $phone : '未入力' ),
			'ご希望のサービス： ' . ( $service ? $service : '未選択' ),
			'',
			'ご相談内容：',
			$message,
			'',
			'---',
			'送信元： ' . $redirect,
		)
	);

	$headers = array(
		'Content-Type: text/plain; charset=UTF-8',
		'Reply-To: ' . $name . ' <' . $email . '>',
	);

	$sent = wp_mail( $to, $subject, $body, $headers );

	wp_safe_redirect( add_query_arg( 'bp_contact', $sent ? 'sent' : 'failed', $redirect ) . '#booking' );
	exit;
}
add_action( 'admin_post_nopriv_bp_contact', 'bp_handle_contact' );
add_action( 'admin_post_bp_contact', 'bp_handle_contact' );

function bp_contact_notice() {
	if ( ! isset( $_GET['bp_contact'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return;
	}

	$status = sanitize_key( wp_unslash( $_GET['bp_contact'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended

	$messages = array(
		'sent'    => array( 'success', 'お問い合わせありがとうございます。2営業日以内にご連絡いたします。' ),
		'invalid' => array( 'error', 'お名前とメールアドレスをご確認ください。' ),
		'failed'  => array( 'error', '送信に失敗しました。お手数ですが、お電話またはInstagramのDMからご連絡ください。' ),
		'error'   => array( 'error', '送信を受け付けられませんでした。時間をおいて、もう一度お試しください。' ),
	);

	if ( ! isset( $messages[ $status ] ) ) {
		return;
	}

	printf(
		'<p class="bp-notice bp-notice--%1$s" role="status">%2$s</p>',
		esc_attr( $messages[ $status ][0] ),
		esc_html( $messages[ $status ][1] )
	);
}

/* ============================================================
   ページネーション
   ============================================================ */

function bp_pagination() {
	$links = paginate_links( array( 'type' => 'array', 'prev_text' => '←', 'next_text' => '→' ) );
	if ( ! $links ) {
		return;
	}
	echo '<nav class="bp-pagination" aria-label="ページ送り">';
	foreach ( $links as $link ) {
		echo wp_kses_post( $link );
	}
	echo '</nav>';
}
