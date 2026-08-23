<?php
/**
 * サービス一覧。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$bp_args = wp_parse_args(
	isset( $args ) ? $args : array(),
	array(
		'ids'      => array(),
		'label'    => 'Our Services',
		'title'    => '提供サービス',
		'subtitle' => "外見だけでなく、内側から輝く自信を育む。\nあなたの人生をアップデートするサービスを提供します。",
		'anchor'   => 'services',
		'tone'     => 'base',
		'align'    => 'center',
	)
);

$bp_query = array(
	'post_type'      => 'bp_service',
	'posts_per_page' => -1,
	'orderby'        => array( 'menu_order' => 'ASC', 'date' => 'ASC' ),
);

if ( ! empty( $bp_args['ids'] ) ) {
	$bp_query['post__in'] = array_map( 'absint', $bp_args['ids'] );
	$bp_query['orderby']  = 'post__in';
}

$bp_services = get_posts( $bp_query );

if ( ! $bp_services ) {
	return;
}
?>
<section id="<?php echo esc_attr( $bp_args['anchor'] ); ?>" class="bp-section bp-section--<?php echo esc_attr( $bp_args['tone'] ); ?>">
	<div class="container">
		<div class="bp-head reveal">
			<span class="section-label"><?php echo esc_html( $bp_args['label'] ); ?></span>
			<h2 class="section-title"><?php echo esc_html( $bp_args['title'] ); ?></h2>
			<?php if ( $bp_args['subtitle'] ) : ?>
				<p class="section-subtitle"><?php echo nl2br( esc_html( $bp_args['subtitle'] ) ); ?></p>
			<?php endif; ?>
		</div>

		<div class="bp-grid bp-grid--<?php echo 'center' === $bp_args['align'] ? '4' : 'cards'; ?>">
			<?php foreach ( $bp_services as $bp_index => $bp_service ) : ?>
				<article class="card-glow bp-service<?php echo 'center' === $bp_args['align'] ? '' : ' bp-service--left'; ?> reveal"
					style="transition-delay:<?php echo (int) ( $bp_index * 60 ); ?>ms;">
					<?php $bp_icon = get_post_meta( $bp_service->ID, 'bp_icon', true ); ?>
					<?php if ( $bp_icon ) : ?>
						<span class="bp-service__icon" aria-hidden="true"><?php echo esc_html( $bp_icon ); ?></span>
					<?php endif; ?>
					<h3><?php echo esc_html( get_the_title( $bp_service ) ); ?></h3>
					<p><?php echo esc_html( wp_strip_all_tags( $bp_service->post_content ) ); ?></p>
				</article>
			<?php endforeach; ?>
		</div>
	</div>
</section>
