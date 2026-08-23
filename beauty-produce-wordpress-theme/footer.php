<?php
/**
 * フッター。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$bp_tel       = bp_option( 'bp_tel' );
$bp_email     = bp_option( 'bp_email' );
$bp_instagram = bp_option( 'bp_instagram' );

$bp_menu_links = array(
	array( 'サービス', home_url( '/#services' ) ),
	array( '変化の物語', home_url( '/#before-after' ) ),
	array( 'お客様の声', home_url( '/#testimonials' ) ),
	array( 'サービスの流れ', home_url( '/#flow' ) ),
	array( 'よくあるご質問', home_url( '/#faq' ) ),
	array( 'ご予約・お問い合わせ', bp_reserve_link() ),
);
?>
</main>

<footer class="bp-footer">
	<span class="float-shape animate-float-2" style="bottom:0;right:0;width:24rem;height:24rem;background:var(--rose-beige);opacity:.05;transform:translate(30%,30%);" aria-hidden="true"></span>

	<div class="container">
		<div class="bp-footer__inner">
			<div>
				<a class="bp-logo" href="<?php echo esc_url( home_url( '/' ) ); ?>">
					<img src="<?php echo esc_url( bp_asset_image( 'logo-mark.webp' ) ); ?>" alt="Beauty Produce" width="44" height="44" />
					<span>
						<b><?php echo esc_html( bp_option( 'bp_brand_name', 'Beauty' ) ); ?></b>
						<i><?php echo esc_html( bp_option( 'bp_brand_sub', 'Produce' ) ); ?></i>
					</span>
				</a>

				<p class="bp-footer__lead"><?php echo esc_html( bp_option( 'bp_hero_lead', '人生のステージごとに変化する美しさ・自信・魅力に寄り添う、あなただけの美容プロデュースサービス。' ) ); ?></p>

				<ul class="bp-footer__contact">
					<?php if ( $bp_tel ) : ?>
						<li>
							<a href="tel:<?php echo esc_attr( preg_replace( '/[^0-9+]/', '', $bp_tel ) ); ?>">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
								<?php echo esc_html( $bp_tel ); ?>
							</a>
						</li>
					<?php endif; ?>

					<?php if ( $bp_email ) : ?>
						<li>
							<a href="mailto:<?php echo esc_attr( $bp_email ); ?>">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>
								<?php echo esc_html( $bp_email ); ?>
							</a>
						</li>
					<?php endif; ?>

					<?php if ( $bp_instagram ) : ?>
						<li>
							<a href="<?php echo esc_url( $bp_instagram ); ?>" target="_blank" rel="noopener noreferrer">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>
								Instagram
							</a>
						</li>
					<?php endif; ?>
				</ul>
			</div>

			<?php $bp_age_pages = bp_get_age_pages(); ?>
			<?php if ( $bp_age_pages ) : ?>
				<div>
					<p class="section-label">Life Stage</p>
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
				<p class="section-label">Menu</p>
				<ul>
					<?php foreach ( $bp_menu_links as $bp_link ) : ?>
						<li><a href="<?php echo esc_url( $bp_link[1] ); ?>"><?php echo esc_html( $bp_link[0] ); ?></a></li>
					<?php endforeach; ?>
				</ul>
			</div>
		</div>

		<div class="bp-footer__bottom">
			<p>&copy; <?php echo esc_html( gmdate( 'Y' ) ); ?> Beauty Produce. All rights reserved.</p>
			<p><?php echo esc_html( bp_option( 'bp_ornament', 'Your Story Begins Here' ) ); ?></p>
		</div>
	</div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
