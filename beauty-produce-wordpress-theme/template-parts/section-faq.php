<?php
/**
 * よくあるご質問。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$bp_faqs = get_posts(
	array(
		'post_type'      => 'bp_faq',
		'posts_per_page' => -1,
		'orderby'        => array( 'menu_order' => 'ASC', 'date' => 'ASC' ),
	)
);

if ( ! $bp_faqs ) {
	return;
}
?>
<section id="faq" class="bp-section" style="background: hsl(42, 35%, 96%);">
	<div class="container">
		<div class="bp-head reveal">
			<span class="section-label">FAQ</span>
			<h2 class="section-title">よくあるご質問</h2>
		</div>

		<div class="bp-narrow">
			<?php foreach ( $bp_faqs as $bp_index => $bp_faq ) : ?>
				<div class="faq-item reveal" data-bp-faq style="transition-delay:<?php echo (int) ( $bp_index * 60 ); ?>ms;">
					<h3>
						<button type="button" class="faq-item__button" aria-expanded="false" aria-controls="bp-faq-<?php echo (int) $bp_faq->ID; ?>">
							<span><?php echo esc_html( get_the_title( $bp_faq ) ); ?></span>
							<svg class="faq-item__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
						</button>
					</h3>
					<div class="faq-item__panel" id="bp-faq-<?php echo (int) $bp_faq->ID; ?>">
						<p><?php echo esc_html( wp_strip_all_tags( $bp_faq->post_content ) ); ?></p>
					</div>
				</div>
			<?php endforeach; ?>
		</div>
	</div>
</section>
