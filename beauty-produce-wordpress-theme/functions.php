<?php
/**
 * Beauty Produce テーマの機能定義。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'BP_THEME_VERSION', '1.0.0' );

/** 年代別ページの初期定義。スラッグをキーに、固定ページ生成と初期値に使用します。 */
function bp_age_definitions() {
	return array(
		'teens' => array(
			'title' => '10代〜20代',
			'label' => 'TEENS & TWENTIES',
			'catch' => '「好き」と「似合う」が、重なりはじめる時期に。',
			'image' => 'age-teens.svg',
			'card'  => '自分に似合うものを、はじめて言葉にする。',
		),
		'thirties' => array(
			'title' => '30代',
			'label' => 'THIRTIES',
			'catch' => '役割が増えるほど、自分の基準が要る。',
			'image' => 'age-30s.svg',
			'card'  => '仕事も家庭も、無理なく成立させる装いへ。',
		),
		'forties' => array(
			'title' => '40代',
			'label' => 'FORTIES',
			'catch' => '積み重ねてきたものが、いちばん似合う。',
			'image' => 'age-40s.svg',
			'card'  => '“ちょうどいい”の基準を、もう一度更新する。',
		),
		'fifties' => array(
			'title' => '50代〜60代',
			'label' => 'FIFTIES & SIXTIES',
			'catch' => 'これからの毎日を、軽やかに。',
			'image' => 'age-50s.svg',
			'card'  => '手放して、選び直す。いちばん自由な年代へ。',
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
	add_theme_support(
		'html5',
		array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script' )
	);

	register_nav_menus(
		array(
			'primary' => __( 'ヘッダーメニュー', 'beauty-produce' ),
		)
	);
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

	wp_enqueue_script(
		'bp-theme',
		get_template_directory_uri() . '/assets/js/theme.js',
		array(),
		BP_THEME_VERSION,
		true
	);
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
	register_post_type(
		'bp_service',
		array(
			'labels' => array(
				'name'          => __( 'サービス', 'beauty-produce' ),
				'singular_name' => __( 'サービス', 'beauty-produce' ),
				'add_new_item'  => __( 'サービスを追加', 'beauty-produce' ),
				'edit_item'     => __( 'サービスを編集', 'beauty-produce' ),
			),
			'public'       => false,
			'show_ui'      => true,
			'show_in_menu' => true,
			'menu_icon'    => 'dashicons-heart',
			'menu_position'=> 21,
			'supports'     => array( 'title', 'editor', 'page-attributes', 'thumbnail' ),
			'has_archive'  => false,
		)
	);

	register_post_type(
		'bp_before_after',
		array(
			'labels' => array(
				'name'          => __( 'ビフォーアフター事例', 'beauty-produce' ),
				'singular_name' => __( 'ビフォーアフター事例', 'beauty-produce' ),
				'add_new_item'  => __( '事例を追加', 'beauty-produce' ),
				'edit_item'     => __( '事例を編集', 'beauty-produce' ),
			),
			'public'       => false,
			'show_ui'      => true,
			'menu_icon'    => 'dashicons-image-flip-horizontal',
			'menu_position'=> 22,
			'supports'     => array( 'title', 'editor', 'thumbnail', 'page-attributes' ),
		)
	);

	register_post_type(
		'bp_testimonial',
		array(
			'labels' => array(
				'name'          => __( 'お客様の声', 'beauty-produce' ),
				'singular_name' => __( 'お客様の声', 'beauty-produce' ),
				'add_new_item'  => __( 'お客様の声を追加', 'beauty-produce' ),
				'edit_item'     => __( 'お客様の声を編集', 'beauty-produce' ),
			),
			'public'       => false,
			'show_ui'      => true,
			'menu_icon'    => 'dashicons-format-quote',
			'menu_position'=> 23,
			'supports'     => array( 'title', 'editor', 'page-attributes' ),
		)
	);

	register_post_type(
		'bp_faq',
		array(
			'labels' => array(
				'name'          => __( 'よくある質問', 'beauty-produce' ),
				'singular_name' => __( 'よくある質問', 'beauty-produce' ),
				'add_new_item'  => __( '質問を追加', 'beauty-produce' ),
				'edit_item'     => __( '質問を編集', 'beauty-produce' ),
			),
			'public'       => false,
			'show_ui'      => true,
			'menu_icon'    => 'dashicons-editor-help',
			'menu_position'=> 24,
			'supports'     => array( 'title', 'editor', 'page-attributes' ),
		)
	);
}
add_action( 'init', 'bp_register_post_types' );

/* ============================================================
   メタボックス
   ============================================================ */

function bp_add_meta_boxes() {
	add_meta_box(
		'bp_service_fields',
		__( 'サービス：編集項目', 'beauty-produce' ),
		'bp_render_service_meta_box',
		'bp_service',
		'normal',
		'high'
	);

	add_meta_box(
		'bp_before_after_fields',
		__( 'ビフォーアフター：編集項目', 'beauty-produce' ),
		'bp_render_before_after_meta_box',
		'bp_before_after',
		'normal',
		'high'
	);

	add_meta_box(
		'bp_testimonial_fields',
		__( 'お客様の声：編集項目', 'beauty-produce' ),
		'bp_render_testimonial_meta_box',
		'bp_testimonial',
		'normal',
		'high'
	);

	add_meta_box(
		'bp_age_fields',
		__( '年代ページ：編集項目', 'beauty-produce' ),
		'bp_render_age_meta_box',
		'page',
		'normal',
		'high'
	);
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
	bp_field_row( '番号（例：01）', 'bp_number', get_post_meta( $post->ID, 'bp_number', true ), 'カードの左上に大きく表示されます。' );
	bp_field_row( '所要時間（例：90分）', 'bp_duration', get_post_meta( $post->ID, 'bp_duration', true ) );
	bp_field_row( '料金（例：¥16,500）', 'bp_price', get_post_meta( $post->ID, 'bp_price', true ) );
	echo '<p class="description">説明文は上の本文欄に入力してください。並び順は「ページ属性 → 順序」で変更できます。</p>';
}

function bp_render_before_after_meta_box( $post ) {
	wp_nonce_field( 'bp_save_meta', 'bp_meta_nonce' );
	bp_field_row(
		'Before画像のURL',
		'bp_before_image',
		get_post_meta( $post->ID, 'bp_before_image', true ),
		'メディアライブラリにアップロードした画像のURLを貼り付けてください。'
	);
	bp_field_row(
		'After画像のURL（任意）',
		'bp_after_image',
		get_post_meta( $post->ID, 'bp_after_image', true ),
		'通常はアイキャッチ画像がAfterとして使われます。アイキャッチを使わない場合のみ、こちらにURLを入力してください。'
	);
	echo '<p class="description">掲載許可をいただいた画像のみご使用ください。説明文は本文欄に入力します。</p>';
}

function bp_render_testimonial_meta_box( $post ) {
	wp_nonce_field( 'bp_save_meta', 'bp_meta_nonce' );
	bp_field_row( 'お名前の表記（例：K様）', 'bp_voice_name', get_post_meta( $post->ID, 'bp_voice_name', true ), '未入力の場合はタイトルが使われます。' );
	bp_field_row( '属性（例：30代・会社員／パーソナルカラー診断）', 'bp_voice_meta', get_post_meta( $post->ID, 'bp_voice_meta', true ) );
	echo '<p class="description">実際に許諾を得た感想のみ登録してください。感想の本文は上の本文欄に入力します。</p>';
}

function bp_render_age_meta_box( $post ) {
	wp_nonce_field( 'bp_save_meta', 'bp_meta_nonce' );

	$template = get_page_template_slug( $post->ID );
	if ( 'page-stage.php' !== $template ) {
		echo '<p>この項目は、右側の「ページ属性 → テンプレート」で <strong>年代別ページ</strong> を選んだときに使われます。</p>';
	}

	bp_field_row( '英字ラベル（例：THIRTIES）', 'bp_age_label', get_post_meta( $post->ID, 'bp_age_label', true ), 'ページ上部に小さく表示されます。' );
	bp_field_row( '年代の表記（例：30代）', 'bp_age_range', get_post_meta( $post->ID, 'bp_age_range', true ), '未入力の場合はページタイトルが使われます。' );
	bp_field_row( 'キャッチコピー', 'bp_age_catch', get_post_meta( $post->ID, 'bp_age_catch', true ) );
	bp_field_row( 'リード文', 'bp_age_lead', get_post_meta( $post->ID, 'bp_age_lead', true ), '', 'textarea' );
	bp_field_row( '年代カードの一言', 'bp_age_card', get_post_meta( $post->ID, 'bp_age_card', true ), 'トップページの年代選択カードに表示されます。' );
	bp_field_row(
		'よくあるお悩み',
		'bp_age_concerns',
		get_post_meta( $post->ID, 'bp_age_concerns', true ),
		'1行につき1件。「見出し | 説明文」の形式で入力してください。',
		'textarea'
	);
	bp_field_row(
		'活躍するシーン',
		'bp_age_scenes',
		get_post_meta( $post->ID, 'bp_age_scenes', true ),
		'1行につき1件。「見出し | 説明文」の形式で入力してください。',
		'textarea'
	);

	// おすすめサービスのチェックボックス
	$selected = (array) get_post_meta( $post->ID, 'bp_age_services', true );
	$services = get_posts(
		array(
			'post_type'      => 'bp_service',
			'posts_per_page' => -1,
			'orderby'        => array( 'menu_order' => 'ASC', 'date' => 'ASC' ),
		)
	);

	echo '<p style="margin:0 0 .35em;font-weight:600;">おすすめのサービス</p>';
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
		'bp_number',
		'bp_duration',
		'bp_price',
		'bp_voice_name',
		'bp_voice_meta',
		'bp_age_label',
		'bp_age_range',
		'bp_age_catch',
		'bp_age_card',
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

	$textarea_fields = array( 'bp_age_lead', 'bp_age_concerns', 'bp_age_scenes' );
	foreach ( $textarea_fields as $field ) {
		if ( isset( $_POST[ $field ] ) ) {
			update_post_meta( $post_id, $field, sanitize_textarea_field( wp_unslash( $_POST[ $field ] ) ) );
		}
	}

	if ( isset( $_POST['bp_age_services'] ) ) {
		$ids = array_map( 'absint', (array) wp_unslash( $_POST['bp_age_services'] ) );
		update_post_meta( $post_id, 'bp_age_services', $ids );
	} elseif ( isset( $_POST['bp_age_label'] ) ) {
		// 年代ページのメタボックスが送信されたのにチェックが無い＝すべて解除。
		update_post_meta( $post_id, 'bp_age_services', array() );
	}
}
add_action( 'save_post', 'bp_save_meta' );

/* ============================================================
   カスタマイザー
   ============================================================ */

function bp_customize_register( $wp_customize ) {
	$wp_customize->add_section(
		'bp_basic',
		array(
			'title'    => __( 'Beauty Produce：基本情報', 'beauty-produce' ),
			'priority' => 20,
		)
	);

	$settings = array(
		'bp_brand_name'    => array( 'label' => 'ブランド名（英字）', 'default' => 'BEAUTY PRODUCE' ),
		'bp_brand_sub'     => array( 'label' => 'ブランド名の2行目（英字）', 'default' => 'PRODUCE' ),
		'bp_tagline'       => array( 'label' => 'タグライン', 'default' => 'あなたらしさを、いちばん美しく。' ),
		'bp_hero_title'    => array( 'label' => 'トップの大見出し', 'default' => "あなたらしさを、\nいちばん美しく。", 'type' => 'textarea' ),
		'bp_hero_lead'     => array( 'label' => 'トップのメッセージ', 'default' => '似合う色、似合う形、似合う空気感。生まれ持ったものを診断で言葉にして、毎日の装いに落とし込むまでを伴走します。', 'type' => 'textarea' ),
		'bp_tel'           => array( 'label' => '電話番号', 'default' => '' ),
		'bp_email'         => array( 'label' => 'メールアドレス', 'default' => '' ),
		'bp_address'       => array( 'label' => '所在地', 'default' => '' ),
		'bp_hours'         => array( 'label' => '営業時間', 'default' => '' ),
		'bp_instagram'     => array( 'label' => 'InstagramのURL', 'default' => '', 'type' => 'url' ),
		'bp_reserve_url'   => array( 'label' => '予約ページURL', 'default' => '', 'type' => 'url', 'description' => '外部の予約サービスを使う場合に入力します。空欄のときはページ内の問い合わせフォームへ移動します。' ),
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

	// メインイラスト
	$wp_customize->add_setting(
		'bp_hero_image',
		array(
			'default'           => '',
			'sanitize_callback' => 'esc_url_raw',
		)
	);
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

/** カスタマイザーの値を取得します。 */
function bp_option( $key, $default = '' ) {
	$value = get_theme_mod( $key, $default );
	return '' === $value || false === $value ? $default : $value;
}

/** テーマ同梱画像のURLを返します。 */
function bp_asset_image( $file ) {
	return get_template_directory_uri() . '/assets/images/' . $file;
}

/** 「見出し | 説明」形式のテキストを配列に変換します。 */
function bp_parse_lines( $raw ) {
	$items = array();
	foreach ( preg_split( '/\r\n|\r|\n/', (string) $raw ) as $line ) {
		$line = trim( $line );
		if ( '' === $line ) {
			continue;
		}
		$parts = array_map( 'trim', explode( '|', $line, 2 ) );
		$items[] = array(
			'title' => $parts[0],
			'body'  => isset( $parts[1] ) ? $parts[1] : '',
		);
	}
	return $items;
}

/** 予約先URL（外部予約が未設定ならトップの問い合わせフォーム）。 */
function bp_reserve_link() {
	$url = bp_option( 'bp_reserve_url' );
	return $url ? $url : home_url( '/#contact' );
}

/** 年代別ページ（page-stage.php テンプレート）の一覧を返します。 */
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

/** 年代ページのイラストURL（アイキャッチ→スラッグ既定→ヒーロー既定の順）。 */
function bp_age_image_url( $page_id ) {
	if ( has_post_thumbnail( $page_id ) ) {
		return get_the_post_thumbnail_url( $page_id, 'large' );
	}

	$slug = get_post_field( 'post_name', $page_id );
	$defs = bp_age_definitions();
	if ( isset( $defs[ $slug ] ) ) {
		return bp_asset_image( $defs[ $slug ]['image'] );
	}

	return bp_asset_image( 'hero-illustration.svg' );
}

/* ============================================================
   有効化時の初期ページ生成
   ============================================================ */

function bp_create_initial_pages() {
	$bp_service_ids = bp_seed_demo_content();
	$bp_age_seeds   = bp_age_seed_content();

	// トップページ
	$front = get_page_by_path( 'home' );
	if ( ! $front ) {
		$front_id = wp_insert_post(
			array(
				'post_title'   => 'ホーム',
				'post_name'    => 'home',
				'post_status'  => 'publish',
				'post_type'    => 'page',
				'post_content' => '',
			)
		);
	} else {
		$front_id = $front->ID;
	}

	if ( $front_id && ! is_wp_error( $front_id ) ) {
		update_option( 'show_on_front', 'page' );
		update_option( 'page_on_front', $front_id );
	}

	// 年代別ページ
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

		if ( '' === get_post_meta( $page_id, 'bp_age_label', true ) ) {
			update_post_meta( $page_id, 'bp_age_label', $def['label'] );
			update_post_meta( $page_id, 'bp_age_range', $def['title'] );
			update_post_meta( $page_id, 'bp_age_catch', $def['catch'] );
			update_post_meta( $page_id, 'bp_age_card', $def['card'] );

			if ( isset( $bp_age_seeds[ $slug ] ) ) {
				$seed = $bp_age_seeds[ $slug ];
				update_post_meta( $page_id, 'bp_age_lead', $seed['lead'] );
				update_post_meta( $page_id, 'bp_age_concerns', $seed['concerns'] );
				update_post_meta( $page_id, 'bp_age_scenes', $seed['scenes'] );

				$ids = array();
				foreach ( $seed['services'] as $service_title ) {
					if ( ! empty( $bp_service_ids[ $service_title ] ) ) {
						$ids[] = (int) $bp_service_ids[ $service_title ];
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
   初期サンプルデータ（有効化時に1度だけ登録）
   ============================================================ */

/** サンプルの投稿を1件登録します。既に同名の投稿があれば何もしません。 */
function bp_seed_post( $post_type, $title, $content, $meta = array(), $order = 0 ) {
	$existing = get_posts(
		array(
			'post_type'      => $post_type,
			'title'          => $title,
			'posts_per_page' => 1,
			'post_status'    => 'any',
		)
	);

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
	// 既に登録済みなら、タイトル→IDの対応表だけを返します。
	if ( get_option( 'bp_demo_seeded' ) ) {
		$map = array();
		foreach ( get_posts( array( 'post_type' => 'bp_service', 'posts_per_page' => -1, 'post_status' => 'any' ) ) as $post ) {
			$map[ $post->post_title ] = (int) $post->ID;
		}
		return $map;
	}

	$services = array(
		array( '01', 'パーソナルカラー診断', '肌・瞳・髪の色みから、顔まわりが明るく見える色のグループを見極めます。ドレープを当てながら、その場で違いを体感していただきます。', '90分', '¥16,500' ),
		array( '02', '骨格診断', '筋肉と脂肪のつき方、関節の大きさから、体をすっきり見せる素材とシルエットを判定。手持ち服が似合わない理由がはっきりします。', '90分', '¥16,500' ),
		array( '03', '顔タイプ診断', 'パーツの配置と輪郭から、あなたの顔立ちが得意なテイストを分類。かわいい・きれいの方向性に迷わなくなります。', '75分', '¥14,300' ),
		array( '04', 'メイクレッスン', '診断結果をもとに、ご自身の手で再現できるメイクを一緒に練習します。お持ちのコスメの使い分けもその場で整理します。', '120分', '¥19,800' ),
		array( '05', 'ヘアスタイル提案', '顔型と骨格に合う長さ・分け目・毛量バランスをご提案。美容室で伝えるためのオーダーシートをお渡しします。', '60分', '¥11,000' ),
		array( '06', 'ワードローブ診断', 'クローゼットの中身を写真で共有いただき、残す服・手放す服・買い足す服を仕分け。着回し表までまとめてお渡しします。', '120分', '¥22,000' ),
		array( '07', '同行ショッピング', '実際の店舗をご一緒しながら、試着と判断のコツをお伝えします。ひとりで買い物に行っても迷わない基準が身につきます。', '180分', '¥33,000' ),
		array( '08', 'トータルプロデュース', '3つの診断からメイク・ヘア・買い物同行まで、必要なものをまとめた総合プラン。節目の年や大切な予定の前におすすめです。', '2日間', '¥88,000' ),
	);

	$service_ids = array();
	foreach ( $services as $index => $service ) {
		$service_ids[ $service[1] ] = bp_seed_post(
			'bp_service',
			$service[1],
			$service[2],
			array(
				'bp_number'   => $service[0],
				'bp_duration' => $service[3],
				'bp_price'    => $service[4],
			),
			$index + 1
		);
	}

	$faqs = array(
		array( 'メイクをしたまま伺ってもよいですか。', 'パーソナルカラー診断は、正確な判定のためにノーメイクをお願いしています。会場でメイク落としをご用意していますので、そのままお越しいただいて大丈夫です。' ),
		array( '所要時間はどのくらいですか。', 'メニューにより60分から180分です。トータルプロデュースは2日間に分けて実施します。ご予約時に目安をお伝えします。' ),
		array( '男性でも受けられますか。', 'はい。パーソナルカラー診断、骨格診断、同行ショッピングは性別を問わずご利用いただけます。' ),
		array( 'オンラインでの対応はありますか。', 'ワードローブ診断とヘアスタイル提案はオンラインでも承ります。カラー診断は光の影響を受けるため、対面をおすすめしています。' ),
		array( '当日の服装に決まりはありますか。', '普段どおりの服装でお越しください。骨格診断では体のラインを確認するため、体に沿う服をお持ちいただけると助かります。' ),
		array( 'キャンセルはできますか。', '前日までのご連絡は無料です。当日のキャンセルは料金の50%を頂戴しています。' ),
	);

	foreach ( $faqs as $index => $faq ) {
		bp_seed_post( 'bp_faq', $faq[0], $faq[1], array(), $index + 1 );
	}

	$voices = array(
		array( 'K様', '30代・会社員／パーソナルカラー診断', '似合う色を知りたくて伺いましたが、いちばん役に立ったのは「なぜ似合うのか」を言葉で説明してもらえたことでした。買い物のときに自分で判断できるようになりました。' ),
		array( 'M様', '40代・主婦／メイクレッスン', '長年同じメイクを続けていました。手順そのものより、量と位置を変えるだけでこんなに変わるのかと驚いています。家でも再現できています。' ),
		array( 'S様', '50代・自営業／ワードローブ診断', 'クローゼットの整理を手伝っていただき、服が三分の一になりました。それなのに着る服がないと思う日がなくなったのが不思議です。' ),
		array( 'Y様', '20代・学生／トータルプロデュース', '就職活動の前に受けました。面接で表情が明るいと言われることが増えて、自信を持って話せるようになりました。' ),
	);

	foreach ( $voices as $index => $voice ) {
		bp_seed_post(
			'bp_testimonial',
			$voice[0],
			$voice[2],
			array(
				'bp_voice_name' => $voice[0],
				'bp_voice_meta' => $voice[1],
			),
			$index + 1
		);
	}

	$cases = array(
		array( '30代・会社員 A様', '手持ちのジャケットはそのままに、インナーと小物の色だけを入れ替えました。顔まわりが明るくなり、写真写りが変わったと言っていただきました。', 'age-30s.svg' ),
		array( '40代・自営業 B様', 'ベースメイクの量を減らし、眉とリップの位置を調整。印象がやわらかくなり、初対面での会話が増えたそうです。', 'age-40s.svg' ),
		array( '50代・パート C様', '暗い色に偏っていた通勤着に、明るいトップスを一枚。合わせ方を決めておくことで、朝の支度が短くなりました。', 'age-50s.svg' ),
	);

	foreach ( $cases as $index => $case ) {
		bp_seed_post(
			'bp_before_after',
			$case[0],
			$case[1],
			array(
				'bp_before_image' => bp_asset_image( $case[2] ),
				'bp_after_image'  => bp_asset_image( 'hero-illustration.svg' ),
			),
			$index + 1
		);
	}

	update_option( 'bp_demo_seeded', 1 );

	return $service_ids;
}

/** 年代ページのサンプル文章。 */
function bp_age_seed_content() {
	return array(
		'teens' => array(
			'lead'     => '流行も、なりたい姿も、たくさん目に入る年代です。そのなかで「わたしにはこれが合う」という軸がひとつあるだけで、洋服選びもメイクもぐっと軽くなります。',
			'concerns' => "流行を追うほど、しっくりこない | SNSで見た通りに真似しても、なぜか浮いて見える。似合う色と形がわかると、流行の取り入れ方が変わります。\nメイクが同じ顔になってしまう | テクニックの前に、顔立ちが得意な方向性を知ることから。塗り方より「どこを立たせるか」が決まります。\n就活・入学で、きちんと見せたい | 第一印象が問われる場面に向けて、清潔感と誠実さが伝わる配色と髪型を整えます。\n予算のなかで失敗したくない | 手持ちを活かす前提で組み立てるので、買い足しは少なく済みます。",
			'scenes'   => "就職活動・面接 | 顔色が明るく見えるシャツの色と、崩れにくいベースメイクを整えます。\n成人式・卒業式 | 振袖や袴の色合わせから、当日のヘアメイクの方向性まで一緒に決めます。\nはじめてのデート | 背伸びしすぎない、いつもの延長で可愛く見えるコーディネートに。\nアルバイト・インターン | きちんと感がありながら動きやすい、無理のない服選びの基準をつくります。",
			'services' => array( 'パーソナルカラー診断', '顔タイプ診断', 'メイクレッスン' ),
		),
		'thirties' => array(
			'lead'     => '仕事の責任が増え、家族との時間も大切にしたい。限られた時間のなかで、迷わず着られて、きちんと見える。そんなワードローブに整えていきます。',
			'concerns' => "20代の服が、急に似合わなくなった | 素材と丈のバランスが変わるタイミングです。骨格に合う質感に置き換えるだけで印象が戻ります。\n朝、着る服を決めるのに時間がかかる | 着回しの型を決めてしまえば、考える時間はほとんど要らなくなります。\n仕事着と普段着が分断している | 両方で使えるアイテムを軸にすると、枚数を増やさずに着回せます。\n自分にお金と時間を使うことに、少し迷いがある | 一度基準をつくると、その後の買い物の失敗が減ります。長い目で見ると節約になります。",
			'scenes'   => "オフィス・商談 | 信頼感が伝わる配色と、体型を拾いすぎないシルエットを選びます。\n保護者会・入園式 | 浮かず、地味すぎず。場に馴染みながら好印象を残す装いに。\n友人の結婚式 | 手持ちのワンピースを活かす小物合わせまでご提案します。\n週末のおでかけ | 動きやすさと今っぽさを両立させる、休日用の型をつくります。",
			'services' => array( 'パーソナルカラー診断', '骨格診断', 'ワードローブ診断' ),
		),
		'forties' => array(
			'lead'     => '若く見せることでも、年齢に合わせて抑えることでもなく。今の自分に合う質感と余白を選び直すと、装いはずっと楽になります。',
			'concerns' => "何を着ても、少し野暮ったく見える | 多くは色と素材のわずかなズレです。手持ちを見直すところから始めます。\n髪と肌の変化に、メイクが追いつかない | 同じ塗り方でも、量と位置を変えるだけで顔立ちが整います。\n若作りにも、老け見えにもしたくない | 狙うのは年齢を感じさせない配分です。差し色と抜きどころを一緒に決めます。\nクローゼットは多いのに着る服がない | 枚数ではなく、組み合わせの少なさが原因です。着回し表で解消します。",
			'scenes'   => "職場でのプレゼン・面談 | 落ち着きと明るさを両立する、顔まわりの色を決めます。\n子どもの学校行事 | 写真に残ることを前提に、明るく上品に見える一式を用意します。\n同窓会・会食 | 久しぶりに会う人に、変わらず素敵だと思われる装いに。\n旅行・観劇 | 長時間でも疲れない素材で、きちんと感のあるコーディネートを。",
			'services' => array( '骨格診断', 'メイクレッスン', 'ワードローブ診断' ),
		),
		'fifties' => array(
			'lead'     => '子育てや仕事がひと段落し、自分のために時間を使えるようになる時期。似合うものを絞り込むほど、身のまわりは軽くなっていきます。',
			'concerns' => "白髪や肌の変化に、服の色が合わなくなった | 髪色が変われば、似合う色も変わります。今の状態で診断し直すことが近道です。\n暗い色ばかりを選んでしまう | 顔まわりに明るい色をひとつ置くだけで、印象は大きく変わります。\nクローゼットを整理したいが、判断できない | 残す基準を先に決めます。基準があれば、迷う時間はなくなります。\n新しい趣味や集まりに、着ていく服がない | これから増える予定に合わせて、必要な型を一緒に組み立てます。",
			'scenes'   => "お稽古・サークル | 動きやすさと品のよさを兼ねた、通いやすい装いに。\n記念写真・お祝いの席 | 節目の日にふさわしい、華やかで落ち着いた一式をご用意します。\n旅行 | 少ない枚数で着回せる、荷物の軽い組み合わせをつくります。\n日常のお買い物 | 普段こそ気持ちが上がる、無理のない色使いを取り入れます。",
			'services' => array( 'パーソナルカラー診断', 'ヘアスタイル提案', 'トータルプロデュース' ),
		),
	);
}

/* ============================================================
   お問い合わせフォーム
   ============================================================ */

function bp_handle_contact() {
	$redirect = wp_get_referer() ? wp_get_referer() : home_url( '/' );

	if ( ! isset( $_POST['bp_contact_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['bp_contact_nonce'] ) ), 'bp_contact' ) ) {
		wp_safe_redirect( add_query_arg( 'bp_contact', 'error', $redirect ) . '#contact' );
		exit;
	}

	// ハニーポット（人間には見えない項目。入力があれば送信しない）
	if ( ! empty( $_POST['bp_website'] ) ) {
		wp_safe_redirect( add_query_arg( 'bp_contact', 'sent', $redirect ) . '#contact' );
		exit;
	}

	$name    = isset( $_POST['bp_name'] ) ? sanitize_text_field( wp_unslash( $_POST['bp_name'] ) ) : '';
	$email   = isset( $_POST['bp_email'] ) ? sanitize_email( wp_unslash( $_POST['bp_email'] ) ) : '';
	$menu    = isset( $_POST['bp_menu'] ) ? sanitize_text_field( wp_unslash( $_POST['bp_menu'] ) ) : '';
	$message = isset( $_POST['bp_message'] ) ? sanitize_textarea_field( wp_unslash( $_POST['bp_message'] ) ) : '';

	if ( '' === $name || ! is_email( $email ) ) {
		wp_safe_redirect( add_query_arg( 'bp_contact', 'invalid', $redirect ) . '#contact' );
		exit;
	}

	$to      = get_option( 'admin_email' );
	$subject = sprintf( '[%s] お問い合わせがありました', wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ) );
	$body    = implode(
		"\n",
		array(
			'お名前： ' . $name,
			'メールアドレス： ' . $email,
			'ご希望のメニュー： ' . ( $menu ? $menu : '未選択' ),
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

	wp_safe_redirect( add_query_arg( 'bp_contact', $sent ? 'sent' : 'failed', $redirect ) . '#contact' );
	exit;
}
add_action( 'admin_post_nopriv_bp_contact', 'bp_handle_contact' );
add_action( 'admin_post_bp_contact', 'bp_handle_contact' );

/** フォーム送信後のメッセージを出力します。 */
function bp_contact_notice() {
	if ( ! isset( $_GET['bp_contact'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return;
	}

	$status = sanitize_key( wp_unslash( $_GET['bp_contact'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended

	$messages = array(
		'sent'    => array( 'success', '送信ありがとうございました。内容を確認のうえ、2営業日以内にご連絡します。' ),
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
