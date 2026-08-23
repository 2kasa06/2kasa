<?php
/**
 * ヘッダー。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$bp_age_pages = bp_get_age_pages();
$bp_sections  = array(
	'services'     => 'サービス',
	'ages'         => '年代別',
	'before-after' => 'ビフォーアフター',
	'voice'        => 'お客様の声',
	'faq'          => 'よくある質問',
);
?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<a class="bp-skip-link" href="#main">本文へ移動</a>

<header class="bp-header" id="bp-header">
	<div class="bp-container bp-header__inner">
		<a class="bp-logo" href="<?php echo esc_url( home_url( '/' ) ); ?>">
			<?php if ( has_custom_logo() ) : ?>
				<?php the_custom_logo(); ?>
			<?php else : ?>
				<img src="<?php echo esc_url( bp_asset_image( 'logo-mark.svg' ) ); ?>" alt="" width="36" height="36" />
			<?php endif; ?>
			<span>
				<span class="bp-logo__main"><?php echo esc_html( bp_option( 'bp_brand_name', 'BEAUTY' ) ); ?></span>
				<span class="bp-logo__sub"><?php echo esc_html( bp_option( 'bp_brand_sub', 'PRODUCE' ) ); ?></span>
			</span>
		</a>

		<nav class="bp-nav" aria-label="メインメニュー">
			<?php foreach ( $bp_sections as $bp_anchor => $bp_label ) : ?>
				<a class="nav-link" href="<?php echo esc_url( home_url( '/#' . $bp_anchor ) ); ?>"><?php echo esc_html( $bp_label ); ?></a>
			<?php endforeach; ?>
			<a class="btn-primary" href="<?php echo esc_url( bp_reserve_link() ); ?>">ご予約・ご相談</a>
		</nav>

		<button type="button" class="bp-burger" id="bp-burger" aria-expanded="false" aria-controls="bp-mobile-menu" aria-label="メニューを開く">
			<span></span><span></span><span></span>
		</button>
	</div>
</header>

<div class="bp-mobile-menu" id="bp-mobile-menu" aria-hidden="true">
	<ul>
		<?php foreach ( $bp_sections as $bp_anchor => $bp_label ) : ?>
			<li><a href="<?php echo esc_url( home_url( '/#' . $bp_anchor ) ); ?>"><?php echo esc_html( $bp_label ); ?></a></li>
		<?php endforeach; ?>
	</ul>

	<?php if ( $bp_age_pages ) : ?>
		<p class="section-label" style="margin-bottom:1rem;">BY AGE</p>
		<div class="bp-age-chips">
			<?php foreach ( $bp_age_pages as $bp_age_page ) : ?>
				<a href="<?php echo esc_url( get_permalink( $bp_age_page ) ); ?>">
					<?php echo esc_html( get_post_meta( $bp_age_page->ID, 'bp_age_range', true ) ? get_post_meta( $bp_age_page->ID, 'bp_age_range', true ) : get_the_title( $bp_age_page ) ); ?>
				</a>
			<?php endforeach; ?>
		</div>
	<?php endif; ?>

	<a class="btn-primary" style="width:100%;" href="<?php echo esc_url( bp_reserve_link() ); ?>">ご予約・ご相談</a>
</div>

<main id="main">
