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
		'orderby'        => array( 'menu_order' => 'ASC', 'date' => 'ASC' ),
	)
);

if ( ! $bp_voices ) {
	return;
}
?>
<section id="testimonials" class="bp-section" style="background: hsl(42, 35%, 96%);">
	<span class="bp-voice-bg" aria-hidden="true"></span>

	<div class="container" style="position:relative;z-index:10;">
		<div class="bp-head reveal">
			<span class="section-label">Testimonials</span>
			<h2 class="section-title">お客様の声</h2>
			<p class="section-subtitle">変化を体験されたお客様からのご感想をご紹介します。</p>
		</div>

		<div class="bp-grid bp-grid--voice">
			<?php foreach ( $bp_voices as $bp_index => $bp_voice ) : ?>
				<?php
				$bp_age_text = get_post_meta( $bp_voice->ID, 'bp_voice_age', true );
				$bp_service  = get_post_meta( $bp_voice->ID, 'bp_voice_service', true );
				$bp_rating   = get_post_meta( $bp_voice->ID, 'bp_voice_rating', true );
				$bp_rating   = $bp_rating ? $bp_rating : 5;
				?>
				<blockquote class="testimonial-card reveal" style="transition-delay:<?php echo (int) ( $bp_index * 100 ); ?>ms;">
					<p class="testimonial-card__stars" aria-label="<?php echo esc_attr( sprintf( '評価 %d / 5', (int) $bp_rating ) ); ?>">
						<?php echo esc_html( bp_stars( $bp_rating ) ); ?>
					</p>

					<p class="testimonial-card__text"><?php echo esc_html( wp_strip_all_tags( $bp_voice->post_content ) ); ?></p>

					<footer class="testimonial-card__foot">
						<span>
							<span class="testimonial-card__name"><?php echo esc_html( get_the_title( $bp_voice ) ); ?></span>
							<?php if ( $bp_age_text ) : ?>
								<span class="testimonial-card__age" style="display:block;"><?php echo esc_html( $bp_age_text ); ?></span>
							<?php endif; ?>
						</span>
						<?php if ( $bp_service ) : ?>
							<span class="testimonial-card__service"><?php echo esc_html( $bp_service ); ?></span>
						<?php endif; ?>
					</footer>
				</blockquote>
			<?php endforeach; ?>
		</div>
	</div>
</section>
