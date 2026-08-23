<?php
/**
 * ビフォーアフター。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$bp_items = get_posts(
	array(
		'post_type'      => 'bp_before_after',
		'posts_per_page' => 6,
		'orderby'        => array( 'menu_order' => 'ASC', 'date' => 'DESC' ),
	)
);

if ( ! $bp_items ) {
	return;
}
?>
<section id="before-after" class="bp-section bp-section--white">
	<?php get_template_part( 'template-parts/shapes' ); ?>

	<div class="bp-container">
		<div class="bp-heading bp-heading--center reveal">
			<p class="section-label">BEFORE / AFTER</p>
			<h2 class="section-title">変化のかたち</h2>
			<p class="section-subtitle">大きく変えるのではなく、似合うほうへ少しずつ寄せていく。中央のつまみを動かすと、変化をご覧いただけます。</p>
		</div>

		<div class="bp-grid bp-grid--3 bp-mt-lg">
			<?php foreach ( $bp_items as $bp_item ) : ?>
				<?php
				$bp_after  = get_the_post_thumbnail_url( $bp_item->ID, 'large' );
				$bp_after  = $bp_after ? $bp_after : get_post_meta( $bp_item->ID, 'bp_after_image', true );
				$bp_before = get_post_meta( $bp_item->ID, 'bp_before_image', true );

				if ( ! $bp_after || ! $bp_before ) {
					continue;
				}
				?>
				<figure class="bp-ba reveal">
					<div class="before-after-container" data-bp-before-after>
						<img src="<?php echo esc_url( $bp_after ); ?>" alt="<?php echo esc_attr( get_the_title( $bp_item ) . ' アフター' ); ?>" loading="lazy" />
						<div class="before-after-container__before" data-bp-clip>
							<img src="<?php echo esc_url( $bp_before ); ?>" alt="<?php echo esc_attr( get_the_title( $bp_item ) . ' ビフォー' ); ?>" loading="lazy" />
						</div>
						<span class="before-after-container__tag before-after-container__tag--before" data-bp-tag-before>BEFORE</span>
						<span class="before-after-container__tag before-after-container__tag--after">AFTER</span>
						<div class="before-after-container__handle" data-bp-handle>
							<button type="button" role="slider" aria-label="<?php echo esc_attr( get_the_title( $bp_item ) . ' の比較スライダー' ); ?>"
								aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">◀▶</button>
						</div>
					</div>
					<figcaption>
						<h3><?php echo esc_html( get_the_title( $bp_item ) ); ?></h3>
						<p><?php echo esc_html( wp_strip_all_tags( $bp_item->post_content ) ); ?></p>
					</figcaption>
				</figure>
			<?php endforeach; ?>
		</div>

		<p class="bp-note">※ 掲載許可をいただいた事例のみ公開しています。</p>
	</div>
</section>
