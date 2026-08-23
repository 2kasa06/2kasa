<?php
/**
 * ヘッダー。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$bp_nav_items = array( array( 'サービス', home_url( '/#services' ) ) );

foreach ( bp_get_age_pages() as $bp_age_page ) {
	$bp_range       = get_post_meta( $bp_age_page->ID, 'bp_age_range', true );
	$bp_nav_items[] = array( $bp_range ? $bp_range : get_the_title( $bp_age_page ), get_permalink( $bp_age_page ) );
}

$bp_nav_items[] = array( 'お客様の声', home_url( '/#testimonials' ) );
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
	<div class="container">
		<nav aria-label="メインメニュー">
			<a class="bp-logo" href="<?php echo esc_url( home_url( '/' ) ); ?>">
				<?php if ( has_custom_logo() ) : ?>
					<?php the_custom_logo(); ?>
				<?php else : ?>
					<img src="<?php echo esc_url( bp_asset_image( 'logo-mark.webp' ) ); ?>" alt="Beauty Produce" width="36" height="36" />
				<?php endif; ?>
				<span>
					<b><?php echo esc_html( bp_option( 'bp_brand_name', 'Beauty' ) ); ?></b>
					<i><?php echo esc_html( bp_option( 'bp_brand_sub', 'Produce' ) ); ?></i>
				</span>
			</a>

			<div class="bp-nav-desktop">
				<?php foreach ( $bp_nav_items as $bp_item ) : ?>
					<a class="nav-link" href="<?php echo esc_url( $bp_item[1] ); ?>"><?php echo esc_html( $bp_item[0] ); ?></a>
				<?php endforeach; ?>
			</div>

			<div class="bp-nav-actions">
				<a class="btn-primary btn-sm bp-nav-cta" href="<?php echo esc_url( bp_reserve_link() ); ?>">ご予約・お問い合わせ</a>

				<button type="button" class="bp-burger" id="bp-burger" aria-expanded="false" aria-controls="bp-mobile-menu" aria-label="メニュー">
					<svg class="bp-icon-menu" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
						<path d="M3 6h18M3 12h18M3 18h18" />
					</svg>
					<svg class="bp-icon-close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
						<path d="M18 6 6 18M6 6l12 12" />
					</svg>
				</button>
			</div>
		</nav>
	</div>
</header>

<div class="bp-mobile-menu" id="bp-mobile-menu" aria-hidden="true">
	<?php foreach ( $bp_nav_items as $bp_index => $bp_item ) : ?>
		<a href="<?php echo esc_url( $bp_item[1] ); ?>" style="transition-delay:<?php echo (int) ( $bp_index * 60 ); ?>ms;">
			<?php echo esc_html( $bp_item[0] ); ?>
		</a>
	<?php endforeach; ?>
	<a class="btn-primary" href="<?php echo esc_url( bp_reserve_link() ); ?>" style="margin-top:1rem;">ご予約・お問い合わせ</a>
</div>

<main id="main">
