<?php
/**
 * よくある質問。
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
<section id="faq" class="bp-section bp-section--white">
	<div class="bp-container bp-container--narrow">
		<div class="bp-heading bp-heading--center reveal">
			<p class="section-label">FAQ</p>
			<h2 class="section-title">よくある質問</h2>
			<p class="section-subtitle">ご予約の前に多くいただくご質問をまとめました。ここにないことは、お気軽にお問い合わせください。</p>
		</div>

		<div class="bp-mt-lg">
			<?php foreach ( $bp_faqs as $bp_index => $bp_faq ) : ?>
				<div class="faq-item reveal<?php echo 0 === $bp_index ? ' is-open' : ''; ?>" data-bp-faq>
					<h3>
						<button type="button" class="faq-item__button"
							aria-expanded="<?php echo 0 === $bp_index ? 'true' : 'false'; ?>"
							aria-controls="bp-faq-panel-<?php echo (int) $bp_faq->ID; ?>">
							<span class="faq-item__q">
								<span aria-hidden="true">Q</span>
								<span><?php echo esc_html( get_the_title( $bp_faq ) ); ?></span>
							</span>
							<span class="faq-item__icon" aria-hidden="true">＋</span>
						</button>
					</h3>
					<div class="faq-item__panel" id="bp-faq-panel-<?php echo (int) $bp_faq->ID; ?>">
						<p><?php echo esc_html( wp_strip_all_tags( $bp_faq->post_content ) ); ?></p>
					</div>
				</div>
			<?php endforeach; ?>
		</div>
	</div>
</section>
