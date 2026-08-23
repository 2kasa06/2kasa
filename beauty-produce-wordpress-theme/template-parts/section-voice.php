<?php
/**
 * お客様の声。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$bp_voices = get_posts(
	array(
		'post_type'      => 'bp_testimonial',
		'posts_per_page' => 6,
		'orderby'        => array( 'menu_order' => 'ASC', 'date' => 'DESC' ),
	)
);

if ( ! $bp_voices ) {
	return;
}
?>
<section id="voice" class="bp-section bp-section--ivory">
	<div class="bp-container">
		<div class="bp-heading bp-heading--center reveal">
			<p class="section-label">VOICE</p>
			<h2 class="section-title">お客様の声</h2>
			<p class="section-subtitle">診断を受けたあと、日々の選択がどう変わったか。実際にご利用いただいた方からいただいた感想です。</p>
		</div>

		<div class="bp-grid bp-grid--2 bp-mt-lg">
			<?php foreach ( $bp_voices as $bp_index => $bp_voice ) : ?>
				<?php
				$bp_name = get_post_meta( $bp_voice->ID, 'bp_voice_name', true );
				$bp_name = $bp_name ? $bp_name : get_the_title( $bp_voice );
				$bp_meta = get_post_meta( $bp_voice->ID, 'bp_voice_meta', true );
				?>
				<blockquote class="testimonial-card reveal" style="transition-delay:<?php echo (int) ( ( $bp_index % 2 ) * 80 ); ?>ms;">
					<p><?php echo esc_html( wp_strip_all_tags( $bp_voice->post_content ) ); ?></p>
					<footer>
						<span class="testimonial-card__avatar" aria-hidden="true"><?php echo esc_html( mb_substr( $bp_name, 0, 1 ) ); ?></span>
						<span>
							<span class="testimonial-card__name"><?php echo esc_html( $bp_name ); ?></span>
							<?php if ( $bp_meta ) : ?>
								<span class="testimonial-card__meta"><?php echo esc_html( $bp_meta ); ?></span>
							<?php endif; ?>
						</span>
					</footer>
				</blockquote>
			<?php endforeach; ?>
		</div>
	</div>
</section>
