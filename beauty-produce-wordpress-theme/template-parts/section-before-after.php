<?php
/**
 * ビフォーアフター（変化の物語）。
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
		'orderby'        => array( 'menu_order' => 'ASC', 'date' => 'ASC' ),
	)
);

if ( ! $bp_items ) {
	return;
}
?>
<section id="before-after" class="bp-section bp-section--base">
	<span class="float-shape animate-float-1" style="top:0;right:0;width:24rem;height:24rem;background:var(--rose-beige);opacity:.05;transform:translate(30%,-30%);" aria-hidden="true"></span>

	<div class="container">
		<div class="bp-head reveal">
			<span class="section-label">Before &amp; After</span>
			<h2 class="section-title">変化の物語</h2>
			<p class="section-subtitle">お客様の実際の変化をご覧ください。<br />外見だけでなく、内側から輝く自信が生まれます。</p>
		</div>

		<div class="bp-grid bp-grid--3 bp-ba">
			<?php foreach ( $bp_items as $bp_index => $bp_item ) : ?>
				<?php
				$bp_after  = get_the_post_thumbnail_url( $bp_item->ID, 'large' );
				$bp_after  = $bp_after ? $bp_after : get_post_meta( $bp_item->ID, 'bp_after_image', true );
				$bp_before = get_post_meta( $bp_item->ID, 'bp_before_image', true );

				if ( ! $bp_after || ! $bp_before ) {
					continue;
				}
				?>
				<figure class="reveal" style="transition-delay:<?php echo (int) ( $bp_index * 150 ); ?>ms;">
					<div class="card-glow">
						<figcaption class="bp-ba__label"><?php echo esc_html( get_the_title( $bp_item ) ); ?></figcaption>

						<div class="before-after-container" data-bp-before-after>
							<img src="<?php echo esc_url( $bp_after ); ?>" alt="After" loading="lazy" />
							<div class="before-after-container__before" data-bp-clip>
								<img src="<?php echo esc_url( $bp_before ); ?>" alt="Before" loading="lazy" />
							</div>
							<span class="before-after-container__tag before-after-container__tag--before">Before</span>
							<span class="before-after-container__tag before-after-container__tag--after">After</span>
							<div class="before-after-container__handle" data-bp-handle>
								<button type="button" role="slider" aria-label="<?php echo esc_attr( get_the_title( $bp_item ) . ' の比較スライダー' ); ?>"
									aria-valuemin="5" aria-valuemax="95" aria-valuenow="50">⟷</button>
							</div>
						</div>

						<p class="bp-ba__desc"><?php echo esc_html( wp_strip_all_tags( $bp_item->post_content ) ); ?></p>
					</div>
				</figure>
			<?php endforeach; ?>
		</div>
	</div>
</section>
