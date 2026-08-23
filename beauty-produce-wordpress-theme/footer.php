<?php
/**
 * フッター。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$bp_services  = get_posts(
	array(
		'post_type'      => 'bp_service',
		'posts_per_page' => 8,
		'orderby'        => array( 'menu_order' => 'ASC', 'date' => 'ASC' ),
	)
);
$bp_age_pages = bp_get_age_pages();
$bp_tel       = bp_option( 'bp_tel' );
$bp_email     = bp_option( 'bp_email' );
$bp_address   = bp_option( 'bp_address' );
$bp_hours     = bp_option( 'bp_hours' );
$bp_instagram = bp_option( 'bp_instagram' );
?>
</main>

<footer class="bp-footer">
	<div class="bp-container">
		<div class="bp-footer__inner">
			<div>
				<a class="bp-logo" href="<?php echo esc_url( home_url( '/' ) ); ?>">
					<img src="<?php echo esc_url( bp_asset_image( 'logo-mark.svg' ) ); ?>" alt="" width="44" height="44" />
					<span>
						<span class="bp-logo__main"><?php echo esc_html( bp_option( 'bp_brand_name', 'BEAUTY' ) ); ?></span>
						<span class="bp-logo__sub"><?php echo esc_html( bp_option( 'bp_brand_sub', 'PRODUCE' ) ); ?></span>
					</span>
				</a>
				<p class="bp-footer__lead"><?php echo esc_html( bp_option( 'bp_hero_lead' ) ); ?></p>
			</div>

			<?php if ( $bp_services ) : ?>
				<div>
					<h2 class="section-label">SERVICE</h2>
					<ul>
						<?php foreach ( $bp_services as $bp_service ) : ?>
							<li><a href="<?php echo esc_url( home_url( '/#services' ) ); ?>"><?php echo esc_html( get_the_title( $bp_service ) ); ?></a></li>
						<?php endforeach; ?>
					</ul>
				</div>
			<?php endif; ?>

			<?php if ( $bp_age_pages ) : ?>
				<div>
					<h2 class="section-label">BY AGE</h2>
					<ul>
						<?php foreach ( $bp_age_pages as $bp_age_page ) : ?>
							<?php $bp_range = get_post_meta( $bp_age_page->ID, 'bp_age_range', true ); ?>
							<li>
								<a href="<?php echo esc_url( get_permalink( $bp_age_page ) ); ?>">
									<?php echo esc_html( $bp_range ? $bp_range : get_the_title( $bp_age_page ) ); ?>
								</a>
							</li>
						<?php endforeach; ?>
					</ul>
				</div>
			<?php endif; ?>

			<div>
				<h2 class="section-label">CONTACT</h2>
				<ul>
					<?php if ( $bp_tel ) : ?>
						<li><a href="tel:<?php echo esc_attr( preg_replace( '/[^0-9+]/', '', $bp_tel ) ); ?>"><?php echo esc_html( $bp_tel ); ?></a></li>
					<?php endif; ?>
					<?php if ( $bp_email ) : ?>
						<li><a href="mailto:<?php echo esc_attr( $bp_email ); ?>"><?php echo esc_html( $bp_email ); ?></a></li>
					<?php endif; ?>
					<?php if ( $bp_address ) : ?>
						<li><?php echo esc_html( $bp_address ); ?></li>
					<?php endif; ?>
					<?php if ( $bp_hours ) : ?>
						<li><?php echo esc_html( $bp_hours ); ?></li>
					<?php endif; ?>
					<?php if ( $bp_instagram ) : ?>
						<li>
							<a class="bp-footer__sns" href="<?php echo esc_url( $bp_instagram ); ?>" target="_blank" rel="noopener noreferrer">
								<span aria-hidden="true">IG</span>Instagram
							</a>
						</li>
					<?php endif; ?>
				</ul>
			</div>
		</div>

		<div class="bp-footer__bottom">
			<p>&copy; <?php echo esc_html( gmdate( 'Y' ) ); ?> <?php echo esc_html( bp_option( 'bp_brand_name', 'BEAUTY PRODUCE' ) ); ?>. All rights reserved.</p>
			<p><?php echo esc_html( bp_option( 'bp_tagline' ) ); ?></p>
		</div>
	</div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
