<?php
/**
 * ライフステージ選択。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$bp_pages = bp_get_age_pages();

if ( ! $bp_pages ) {
	return;
}
?>
<section id="age-select" class="bp-section" style="background: hsl(42, 35%, 96%);">
	<span class="bp-age-bg" aria-hidden="true"></span>

	<div class="container" style="position:relative;z-index:10;">
		<div class="bp-head reveal">
			<span class="section-label">Your Life Stage</span>
			<h2 class="section-title">あなたのステージを選んでください</h2>
			<p class="section-subtitle">人生のどのステージにいても、<br />あなたらしい美しさを見つける旅は始められます。</p>
		</div>

		<div class="bp-grid bp-grid--cards">
			<?php foreach ( $bp_pages as $bp_index => $bp_page ) : ?>
				<?php
				$bp_range   = get_post_meta( $bp_page->ID, 'bp_age_range', true );
				$bp_range   = $bp_range ? $bp_range : get_the_title( $bp_page );
				$bp_en      = get_post_meta( $bp_page->ID, 'bp_age_en', true );
				$bp_concept = get_post_meta( $bp_page->ID, 'bp_age_tagline', true );
				?>
				<a class="age-card reveal" href="<?php echo esc_url( get_permalink( $bp_page ) ); ?>"
					style="transition-delay:<?php echo (int) ( $bp_index * 100 ); ?>ms;">
					<img src="<?php echo esc_url( bp_age_image_url( $bp_page->ID ) ); ?>" alt="<?php echo esc_attr( $bp_range ); ?>" loading="lazy" />
					<span class="age-card__veil" aria-hidden="true"></span>
					<span class="age-card__body">
						<?php if ( $bp_en ) : ?>
							<span class="age-card__en"><?php echo esc_html( $bp_en ); ?></span>
						<?php endif; ?>
						<span class="age-card__range"><?php echo esc_html( $bp_range ); ?></span>
						<?php if ( $bp_concept ) : ?>
							<span class="age-card__concept"><?php echo esc_html( $bp_concept ); ?></span>
						<?php endif; ?>
						<span class="age-card__more">
							詳しく見る
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
						</span>
					</span>
				</a>
			<?php endforeach; ?>
		</div>
	</div>
</section>
